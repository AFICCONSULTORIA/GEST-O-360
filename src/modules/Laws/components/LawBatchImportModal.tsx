import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Files, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Building2, 
  Landmark, 
  FileText, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Newspaper,
  Copy,
  Check,
  FileSpreadsheet,
  Columns,
  Zap
} from 'lucide-react';
import { MunicipalLaw, Institution, LawCategory } from '../../../types';
import { extractLawTextFromPdf, extractLawFromPastedText, ExtractedLawResult } from '../services/pdfTextExtractor';
import { 
  parseLawDocument, 
  paginateLawDocument, 
  BudgetTableBlock, 
  budgetTableToTSV, 
  budgetTableToText 
} from '../utils/lawFormatter';
import { LAW_TYPES, LAW_CATEGORIES } from './LawFormModal';
import { showToast } from '../../../components/ui/Toast';

export interface BatchLawItem {
  id: string;
  fileName: string;
  file?: File;
  fileUrl?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progressStep?: string;
  source?: 'native_pdf' | 'ai_ocr';
  elapsedMs?: number;
  extractedData?: {
    type: string;
    number: string;
    year: number;
    title: string;
    ementa: string;
    preambulo?: string;
    publication_date: string;
    author?: string;
    origin_power: 'executivo' | 'legislativo';
    category?: LawCategory;
    tags?: string[];
    materia_numero?: string;
    full_text: string;
    budget_tables?: any[];
  };
  errorMessage?: string;
}

interface LawBatchImportModalProps {
  institution?: Institution | null;
  onClose: () => void;
  onBatchSaved: (lawsToSave: Array<{ data: Partial<MunicipalLaw>; file?: File }>) => Promise<void>;
}

export const LawBatchImportModal: React.FC<LawBatchImportModalProps> = ({
  institution,
  onClose,
  onBatchSaved
}) => {
  const [activeMode, setActiveMode] = useState<'pdf_batch' | 'paste_text'>('pdf_batch');
  const [items, setItems] = useState<BatchLawItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [inspectTab, setInspectTab] = useState<'preview_a4' | 'side_by_side' | 'full_text' | 'fields'>('preview_a4');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copiedTableIdx, setCopiedTableIdx] = useState<number | null>(null);

  // Estado para texto colado
  const [pastedText, setPastedText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Adiciona novos arquivos à fila e inicia processamento paralelo
  const handleAddFiles = (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;

    const rawArray = Array.from(fileList);
    const newFiles = rawArray.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (newFiles.length === 0) {
      showToast('Por favor, selecione arquivos no formato PDF.', 'warning');
      return;
    }

    const newItems: BatchLawItem[] = newFiles.map(f => ({
      id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      fileName: f.name,
      file: f,
      fileUrl: URL.createObjectURL(f),
      status: 'pending',
      progressStep: 'Aguardando na fila de leitura...'
    }));

    setItems(prev => {
      const merged = [...prev, ...newItems];
      if (!selectedItemId && merged.length > 0) {
        setSelectedItemId(merged[0].id);
      }
      return merged;
    });

    setTimeout(() => {
      startProcessingQueue(newItems);
    }, 80);
  };

  // Processa um único item (usado pela fila paralela e pelo botão de Reprocessar)
  const processSingleItem = async (targetItem: BatchLawItem) => {
    if (!targetItem.file) return;
    const startTime = Date.now();

    setItems(prev => prev.map(it => it.id === targetItem.id ? {
      ...it,
      status: 'processing',
      errorMessage: undefined,
      progressStep: `Analisando ${targetItem.fileName}...`
    } : it));

    try {
      const result: ExtractedLawResult = await extractLawTextFromPdf(
        targetItem.file,
        (step) => {
          setItems(prev => prev.map(it => it.id === targetItem.id ? {
            ...it,
            progressStep: step
          } : it));
        },
        institution?.name
      );

      const elapsedMs = Date.now() - startTime;
      const secs = (elapsedMs / 1000).toFixed(1);

      setItems(prev => prev.map(it => it.id === targetItem.id ? {
        ...it,
        status: 'done',
        source: result.source,
        elapsedMs,
        extractedData: result.structuredData,
        progressStep: result.source === 'native_pdf' 
          ? `Extraído em ${secs}s (Camada Digital)` 
          : `Transcrito em ${secs}s via IA Gemini OCR`
      } : it));
    } catch (err: any) {
      console.error('Erro ao processar PDF:', err);
      setItems(prev => prev.map(it => it.id === targetItem.id ? {
        ...it,
        status: 'error',
        progressStep: 'Falha na leitura',
        errorMessage: err?.message || 'Não foi possível extrair o texto deste PDF.'
      } : it));
    }
  };

  // Fila com concorrência controlada (até 3 PDFs simultâneos para máxima velocidade)
  const startProcessingQueue = async (itemsToProcess: BatchLawItem[]) => {
    setIsProcessingQueue(true);
    const CONCURRENCY = 3;
    const queue = [...itemsToProcess];

    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || !current.file) continue;
        await processSingleItem(current);
      }
    });

    await Promise.all(workers);
    setIsProcessingQueue(false);
  };

  // Processa texto bruto colado via Ctrl+V
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      showToast('Cole o texto da lei ou decreto para estruturar.', 'warning');
      return;
    }

    try {
      const result = extractLawFromPastedText(pastedText, institution?.name);
      const newItem: BatchLawItem = {
        id: `paste_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        fileName: `${result.structuredData.type} ${result.structuredData.number}/${result.structuredData.year}`,
        status: 'done',
        source: 'native_pdf',
        elapsedMs: 120,
        extractedData: result.structuredData,
        progressStep: 'Texto estruturado instantaneamente!'
      };

      setItems(prev => [newItem, ...prev]);
      setSelectedItemId(newItem.id);
      setInspectTab('preview_a4');
      setPastedText('');
      showToast('Norma estruturada com sucesso! Confira a Prévia A4.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao estruturar o texto colado.', 'error');
    }
  };

  // Atualiza campo do item selecionado
  const handleUpdateCurrentField = (field: string, value: any) => {
    if (!selectedItemId) return;
    setItems(prev => prev.map(it => {
      if (it.id === selectedItemId && it.extractedData) {
        return {
          ...it,
          extractedData: {
            ...it.extractedData,
            [field]: value
          }
        };
      }
      return it;
    }));
  };

  // Re-extrai metadados a partir do texto integral editado manualmente
  const handleReparseCurrentText = () => {
    const current = items.find(it => it.id === selectedItemId);
    if (!current?.extractedData?.full_text) return;

    const reExtracted = extractLawFromPastedText(current.extractedData.full_text, institution?.name);
    setItems(prev => prev.map(it => {
      if (it.id === selectedItemId) {
        return {
          ...it,
          extractedData: {
            ...reExtracted.structuredData,
            full_text: current.extractedData!.full_text
          }
        };
      }
      return it;
    }));
    showToast('Metadados e tabelas reprocessados a partir do texto!', 'success');
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => {
      const target = prev.find(it => it.id === id);
      if (target?.fileUrl) {
        URL.revokeObjectURL(target.fileUrl);
      }
      const filtered = prev.filter(it => it.id !== id);
      if (selectedItemId === id) {
        setSelectedItemId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Salvar Todas as Leis Processadas no Banco
  const handleSaveAll = async () => {
    const readyItems = items.filter(it => it.status === 'done' && it.extractedData);
    if (readyItems.length === 0) {
      showToast('Nenhuma norma concluída para publicação.', 'warning');
      return;
    }

    setIsSavingAll(true);
    try {
      const payloadList = readyItems.map(it => {
        const ext = it.extractedData!;
        return {
          data: {
            type: ext.type as any,
            number: ext.number,
            title: ext.title,
            ementa: ext.ementa,
            full_text: ext.full_text,
            publication_date: ext.publication_date,
            status: 'Em Vigor' as any,
            category: ext.category || 'Administração Geral',
            origin_power: ext.origin_power,
            author: ext.author || institution?.name || 'Prefeitura Municipal',
            materia_numero: ext.materia_numero,
            tags: ext.tags && ext.tags.length > 0 ? ext.tags : ['Legislação Municipal']
          },
          file: it.file
        };
      });

      await onBatchSaved(payloadList);
      showToast(`Sucesso! ${payloadList.length} ${payloadList.length === 1 ? 'norma publicada' : 'normas publicadas'} com texto integral e formatação A4!`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar lote de normas.', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  const selectedItem = items.find(it => it.id === selectedItemId);
  const doneCount = items.filter(it => it.status === 'done').length;
  const errorCount = items.filter(it => it.status === 'error').length;

  // Estrutura A4 paginada real do item selecionado
  const parsedSelectedDoc = useMemo(() => {
    if (!selectedItem?.extractedData) return null;
    const ext = selectedItem.extractedData;
    return parseLawDocument(ext.full_text || ext.ementa, ext.ementa, {
      type: ext.type,
      number: ext.number,
      publication_date: ext.publication_date,
      author: ext.author
    });
  }, [selectedItem]);

  const selectedPages = useMemo(() => {
    if (!parsedSelectedDoc) return [];
    return paginateLawDocument(parsedSelectedDoc);
  }, [parsedSelectedDoc]);

  const handleCopyBudgetTable = (block: BudgetTableBlock, idx: number, asExcel: boolean) => {
    const content = asExcel ? budgetTableToTSV(block) : budgetTableToText(block);
    navigator.clipboard.writeText(content);
    setCopiedTableIdx(idx);
    showToast(
      asExcel ? 'Tabela copiada para Excel / Planilhas!' : 'Dotação orçamentária copiada!',
      'success'
    );
    setTimeout(() => setCopiedTableIdx(null), 2000);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-neutral-950/85 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.96, y: 15 }} 
          animate={{ scale: 1, y: 0 }} 
          exit={{ scale: 0.96, y: 15 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-7xl h-[94vh] rounded-[28px] shadow-2xl flex flex-col border border-neutral-200 dark:border-neutral-800 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* TOPO DO MODAL */}
          <div className="p-4 sm:px-6 sm:py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/95 dark:bg-neutral-900/95 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Files size={20} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                    Central de Importação & Transcrição Inteligente de Normas
                  </h2>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                    ⚡ Leitor Híbrido (Digital 1s + OCR IA 5s)
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Arraste 1 ou vários PDFs (Diário Oficial AMM-MT ou Leis Antigas) ou cole o texto para gerar automaticamente a folha A4 oficial e tabelas orçamentárias.
                </p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* BARRA DE MODO DE ENTRADA E PROGRESSO */}
          <div className="px-4 sm:px-6 py-2.5 bg-neutral-100/80 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMode('pdf_batch')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'pdf_batch'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
              >
                <Files size={14} />
                <span>Arquivos PDF (Individual ou Lote)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('paste_text')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'paste_text'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
              >
                <Edit3 size={14} />
                <span>Colar Texto Bruto (Word / Diário)</span>
              </button>
            </div>

            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  {doneCount} de {items.length} {items.length === 1 ? 'norma pronta' : 'normas prontas'}
                </span>
                {errorCount > 0 && (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                    {errorCount} com erro
                  </span>
                )}
                {isProcessingQueue && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full animate-pulse border border-emerald-300 dark:border-emerald-800">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Transcrevendo lote em paralelo...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =========================================================================
              ESTADO INICIAL VAZIO: DROPZONE AMPLO E PRODUTIVO
             ========================================================================= */}
          {items.length === 0 && activeMode === 'pdf_batch' ? (
            <div 
              className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center bg-neutral-50/50 dark:bg-neutral-950/30 overflow-y-auto"
              onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDraggingOver(false);
                handleAddFiles(e.dataTransfer.files);
              }}
            >
              <label 
                className={`w-full max-w-3xl p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center text-center space-y-4 ${
                  isDraggingOver 
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 scale-[1.01]' 
                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-neutral-800/70 shadow-sm'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <UploadCloud size={34} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
                    Clique para selecionar ou arraste os PDFs das Leis aqui
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
                    Suporta tanto <strong>Diários Oficiais vetoriais (AMM-MT)</strong> e <strong>leis antigas escaneadas</strong> quanto PDFs digitais. 
                    O sistema extrai o texto integral, separa todas as tabelas de dotação orçamentária e monta as folhas A4 automaticamente.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <span className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/20">
                    <Sparkles size={15} />
                    <span>Escolher Arquivos PDF no Computador</span>
                  </span>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      setActiveMode('paste_text');
                    }}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Ou Colar Texto Copiado</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-neutral-100 dark:border-neutral-800 text-left">
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Zap size={12} /> 1. Leitura Ultrarrápida (~5s)
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Processamento paralelo de múltiplos PDFs sem travar a tela.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="text-[11px] font-black text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <Newspaper size={12} /> 2. Padrão Diário A4
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Epígrafe, ementa recuada, artigos e tabelas por Órgão paginados.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="text-[11px] font-black text-purple-700 dark:text-purple-400 flex items-center gap-1">
                      <Columns size={12} /> 3. Conferência Lado a Lado
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Compare o PDF original anexado com a transcrição antes de publicar.
                    </p>
                  </div>
                </div>

                <input 
                  ref={fileInputRef}
                  type="file" 
                  multiple 
                  accept=".pdf,application/pdf" 
                  className="hidden" 
                  onChange={e => handleAddFiles(e.target.files)}
                />
              </label>
            </div>
          ) : (
            /* =========================================================================
               CORPO PRINCIPAL COM DIVISÃO: FILA À ESQUERDA E INSPEÇÃO A4 À DIREITA
               ========================================================================= */
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              
              {/* PAINEL ESQUERDO: LISTA DE NORMAS CARREGADAS */}
              <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/30 flex flex-col shrink-0 max-h-60 lg:max-h-none">
                
                {/* Controles de Entrada na Coluna Esquerda */}
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                  {activeMode === 'pdf_batch' ? (
                    <label className="w-full py-2.5 px-3 bg-white dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-neutral-700 border-2 border-dashed border-emerald-400 dark:border-emerald-700 hover:border-emerald-500 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                      <UploadCloud size={16} className="text-emerald-600" />
                      <span>+ Adicionar Mais Arquivos PDF</span>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        multiple 
                        accept=".pdf,application/pdf" 
                        className="hidden" 
                        onChange={e => handleAddFiles(e.target.files)}
                      />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        value={pastedText}
                        onChange={e => setPastedText(e.target.value)}
                        placeholder="Cole aqui o texto integral da lei copiado do Word ou Diário Oficial (Ctrl+V)..."
                        className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-xs text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleProcessPastedText}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Sparkles size={14} />
                        <span>Estruturar e Gerar Folha A4</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Lista dos Itens na Fila */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  {items.map((item) => {
                    const isSelected = item.id === selectedItemId;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative ${
                          isSelected
                            ? 'bg-white dark:bg-neutral-800 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                            : 'bg-white/60 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800/80 hover:bg-white dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {item.status === 'done' ? (
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              ) : item.status === 'processing' ? (
                                <Loader2 size={14} className="text-emerald-600 animate-spin shrink-0" />
                              ) : item.status === 'error' ? (
                                <AlertCircle size={14} className="text-rose-500 shrink-0" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-600 shrink-0" />
                              )}

                              <span className="font-black text-xs text-neutral-900 dark:text-white truncate">
                                {item.extractedData 
                                  ? `${item.extractedData.type} ${item.extractedData.number}`
                                  : item.fileName}
                              </span>
                            </div>

                            {item.extractedData?.title && (
                              <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 truncate mt-0.5">
                                {item.extractedData.title}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] flex-wrap">
                              {item.status === 'done' && (
                                <span className={`font-bold px-1.5 py-0.5 rounded ${
                                  item.source === 'native_pdf'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}>
                                  {item.source === 'native_pdf' ? '⚡ Digital' : '✨ IA OCR'}
                                </span>
                              )}
                              <span className="text-neutral-500 dark:text-neutral-400 truncate">
                                {item.progressStep}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.status === 'error' && item.file && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  processSingleItem(item);
                                }}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                title="Tentar novamente"
                              >
                                <RefreshCw size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveItem(item.id);
                              }}
                              className="p-1 text-neutral-400 hover:text-rose-500 rounded cursor-pointer transition-colors"
                              title="Remover da lista"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PAINEL DIREITO: INSPEÇÃO DETALHADA, PRÉVIA A4 E COMPARAÇÃO LADO A LADO */}
              <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 overflow-hidden">
                {selectedItem ? (
                  <>
                    {/* Barra de Abas de Inspeção */}
                    <div className="px-4 sm:px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => setInspectTab('preview_a4')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            inspectTab === 'preview_a4'
                              ? 'bg-[#004a80] text-white shadow-xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Newspaper size={14} />
                          <span>1. Prévia A4 Diário Oficial ({selectedPages.length} {selectedPages.length === 1 ? 'pág' : 'págs'})</span>
                        </button>

                        {selectedItem.fileUrl && (
                          <button
                            type="button"
                            onClick={() => setInspectTab('side_by_side')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                              inspectTab === 'side_by_side'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <Columns size={14} />
                            <span>2. Comparar PDF ⇄ Transcrição</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setInspectTab('full_text')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            inspectTab === 'full_text'
                              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <FileText size={14} />
                          <span>3. Editar Texto Integral</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectTab('fields')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            inspectTab === 'fields'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Layers size={14} />
                          <span>4. Classificação & Metadados</span>
                        </button>
                      </div>

                      {selectedItem.extractedData && (
                        <span className="text-xs font-mono font-bold text-neutral-500">
                          {selectedItem.extractedData.type} nº {selectedItem.extractedData.number}
                        </span>
                      )}
                    </div>

                    {/* Conteúdo da Aba Selecionada */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                      {selectedItem.status === 'processing' || selectedItem.status === 'pending' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                            <Loader2 size={34} className="animate-spin" />
                          </div>
                          <h3 className="font-black text-neutral-900 dark:text-white text-base">
                            {selectedItem.progressStep || 'Lendo e estruturando documento...'}
                          </h3>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-md leading-relaxed">
                            Extraindo epígrafe, ementa, todos os artigos na íntegra e reconstruindo as tabelas de dotação orçamentária por Órgão.
                          </p>
                        </div>
                      ) : selectedItem.status === 'error' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                          <AlertCircle size={42} className="text-rose-500" />
                          <h3 className="font-black text-rose-600 text-base">Falha ao ler este arquivo PDF</h3>
                          <p className="text-xs text-neutral-500 max-w-md">{selectedItem.errorMessage}</p>
                          {selectedItem.file && (
                            <button
                              type="button"
                              onClick={() => processSingleItem(selectedItem)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm"
                            >
                              <RefreshCw size={14} />
                              <span>Tentar Novamente</span>
                            </button>
                          )}
                        </div>
                      ) : selectedItem.extractedData && parsedSelectedDoc ? (
                        <>
                          {/* ABA 1: PRÉVIA A4 PAGINADA FIEL AO DIÁRIO OFICIAL */}
                          {inspectTab === 'preview_a4' && (
                            <div className="space-y-6 bg-neutral-200/70 dark:bg-neutral-950 p-4 sm:p-6 rounded-2xl">
                              {selectedPages.map((page) => (
                                <div
                                  key={`batch-preview-page-${page.pageNumber}`}
                                  className="bg-white text-neutral-900 p-6 sm:p-12 rounded-sm shadow-xl border border-neutral-300 max-w-[820px] mx-auto min-h-[820px] flex flex-col justify-between font-serif"
                                >
                                  <div>
                                    {/* Cabeçalho AMM-MT */}
                                    <div className="flex items-center justify-between border-b-2 border-[#004a80] pb-2 mb-6 text-xs font-sans">
                                      <span className="font-black text-[#004a80] tracking-wider">
                                        {parsedSelectedDoc.diarioHeader.diario}
                                      </span>
                                      <span className="text-neutral-700 font-medium">
                                        {parsedSelectedDoc.diarioHeader.edicaoData}
                                      </span>
                                      <span className="font-bold text-[#004a80]">
                                        {parsedSelectedDoc.diarioHeader.estado}
                                      </span>
                                    </div>

                                    {/* Epígrafe */}
                                    {page.includeEpigraph && (
                                      <div className="text-center my-5 space-y-1">
                                        <h4 className="text-lg sm:text-xl font-black tracking-wide text-neutral-900 uppercase">
                                          {parsedSelectedDoc.epigrafe.tipoNumero}
                                        </h4>
                                        <p className="text-xs font-semibold text-neutral-700">
                                          {parsedSelectedDoc.epigrafe.data}
                                        </p>
                                        <p className="text-[11px] font-black text-[#004a80] uppercase tracking-wider font-sans">
                                          {parsedSelectedDoc.epigrafe.entidade}
                                        </p>
                                      </div>
                                    )}

                                    {/* Ementa */}
                                    {page.includeEmenta && parsedSelectedDoc.ementa && (
                                      <div className="flex justify-end my-5">
                                        <div className="w-full sm:w-[58%] text-justify text-xs italic leading-relaxed text-neutral-900 border-l-2 border-[#004a80]/40 pl-3">
                                          "{parsedSelectedDoc.ementa}"
                                        </div>
                                      </div>
                                    )}

                                    {/* Preâmbulo */}
                                    {page.includePreambulo && parsedSelectedDoc.preambulo && (
                                      <p className="text-xs leading-relaxed text-justify text-neutral-900 indent-8 mb-4">
                                        {parsedSelectedDoc.preambulo}
                                      </p>
                                    )}

                                    {/* Artigos e Tabelas de Dotação Orçamentária */}
                                    <div className="space-y-3 text-xs leading-relaxed text-justify text-neutral-900">
                                      {page.blocks.map((block, bIdx) => {
                                        if (block.type === 'budget_table') {
                                          const bTable = block as BudgetTableBlock;
                                          return (
                                            <div key={`btable-${bIdx}`} className="my-4 font-sans">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-bold text-neutral-800">
                                                  {bTable.entity || (bTable.isContinuation ? 'Dotação Orçamentária (Continuação)' : 'Dotação Orçamentária')}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopyBudgetTable(bTable, bIdx, false)}
                                                    className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center gap-1 border border-neutral-300 cursor-pointer"
                                                  >
                                                    {copiedTableIdx === bIdx ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                                                    <span>Copiar</span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopyBudgetTable(bTable, bIdx, true)}
                                                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-300 cursor-pointer"
                                                  >
                                                    <FileSpreadsheet size={10} className="text-emerald-600" />
                                                    <span>Excel</span>
                                                  </button>
                                                </div>
                                              </div>
                                              <div className="border border-neutral-400 rounded-md overflow-hidden bg-white">
                                                <table className="w-full text-[11px] border-collapse">
                                                  <tbody>
                                                    {bTable.rows.map((r, rIdx) => (
                                                      <tr key={rIdx} className="border-b border-neutral-300 last:border-b-0">
                                                        <td className="w-40 font-bold bg-neutral-100 px-2.5 py-1.5 border-r border-neutral-300 text-neutral-900">
                                                          {r.label}
                                                        </td>
                                                        <td className="px-2.5 py-1.5 text-neutral-900">
                                                          {r.isNaturezaDespesa && r.naturezaValor ? (
                                                            <div className="flex items-center justify-between gap-2">
                                                              <span className="font-semibold">{r.naturezaCodeDesc}</span>
                                                              <span className="flex-1 border-b border-dotted border-neutral-400 mx-2" />
                                                              <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                                {r.naturezaValor}
                                                              </span>
                                                            </div>
                                                          ) : (
                                                            <span className={r.isOrgao ? 'font-bold' : ''}>{r.value}</span>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return (
                                          <p key={`blk-${bIdx}`} className="indent-8">
                                            {block.rawText}
                                          </p>
                                        );
                                      })}
                                    </div>

                                    {/* Fecho e Assinatura */}
                                    {page.includeFechoAssinatura && (
                                      <div className="mt-10 pt-4 text-center">
                                        {parsedSelectedDoc.fecho && (
                                          <p className="text-xs text-right text-neutral-800 italic mb-8">
                                            {parsedSelectedDoc.fecho}
                                          </p>
                                        )}
                                        <div className="w-56 mx-auto border-t border-neutral-400 mb-1.5" />
                                        <p className="text-xs font-black uppercase text-neutral-900 font-sans">
                                          {parsedSelectedDoc.assinatura.nome}
                                        </p>
                                        <p className="text-[11px] text-neutral-600 font-sans">
                                          {parsedSelectedDoc.assinatura.cargo}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Rodapé A4 com Gestão 360 */}
                                  <div className="mt-8 pt-2 border-t border-neutral-300 font-sans space-y-1">
                                    <div className="flex justify-between items-center text-[10px] text-neutral-500">
                                      <span>Página {page.pageNumber} de {page.totalPages}</span>
                                      <span className="font-mono">amm.diariomunicipal.org</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] text-neutral-500 pt-1 border-t border-dotted border-neutral-200">
                                      <span className="font-bold text-emerald-800">
                                        🛡️ DOCUMENTO OFICIAL PUBLICADO VIA GESTÃO 360
                                      </span>
                                      <span className="font-mono">gestao360.com.br</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ABA 2: COMPARAR PDF ORIGINAL ⇄ TRANSCRIÇÃO LADO A LADO */}
                          {inspectTab === 'side_by_side' && selectedItem.fileUrl && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[68vh]">
                              <div className="flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900">
                                <div className="px-3 py-2 bg-neutral-800 text-white text-xs font-bold flex items-center justify-between">
                                  <span>📄 PDF Oficial Original ({selectedItem.fileName})</span>
                                  <a 
                                    href={selectedItem.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-emerald-400 hover:underline"
                                  >
                                    Abrir em nova guia ↗
                                  </a>
                                </div>
                                <iframe
                                  src={selectedItem.fileUrl}
                                  title="PDF Original"
                                  className="w-full flex-1 border-0 bg-white"
                                />
                              </div>

                              <div className="flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-neutral-800 dark:text-white">
                                    ✨ Texto Integral Transcrito (Editável em Tempo Real)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleReparseCurrentText}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    Atualizar Folha A4
                                  </button>
                                </div>
                                <textarea
                                  value={selectedItem.extractedData.full_text}
                                  onChange={e => handleUpdateCurrentField('full_text', e.target.value)}
                                  className="w-full flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 font-mono text-xs leading-relaxed text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                />
                              </div>
                            </div>
                          )}

                          {/* ABA 3: TEXTO INTEGRAL & EMENTA */}
                          {inspectTab === 'full_text' && (
                            <div className="space-y-4 max-w-4xl mx-auto">
                              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 block mb-1">
                                  Ementa Oficial
                                </span>
                                <textarea
                                  rows={2}
                                  value={selectedItem.extractedData.ementa}
                                  onChange={e => handleUpdateCurrentField('ementa', e.target.value)}
                                  className="w-full bg-transparent font-serif italic text-xs text-neutral-800 dark:text-neutral-200 outline-none resize-none"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                                    <FileText size={14} className="text-emerald-500" />
                                    <span>Texto Integral da Norma (Artigos, Dotações e Assinatura)</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={handleReparseCurrentText}
                                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-300 dark:border-emerald-800 cursor-pointer flex items-center gap-1"
                                  >
                                    <Zap size={12} />
                                    <span>Reprocessar Tabelas e Folha A4</span>
                                  </button>
                                </div>
                                <textarea
                                  rows={18}
                                  value={selectedItem.extractedData.full_text}
                                  onChange={e => handleUpdateCurrentField('full_text', e.target.value)}
                                  className="w-full bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 font-mono text-xs leading-relaxed text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 select-text"
                                />
                              </div>
                            </div>
                          )}

                          {/* ABA 4: METADADOS E CLASSIFICAÇÃO */}
                          {inspectTab === 'fields' && (
                            <div className="max-w-3xl mx-auto space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1">Espécie Normativa</label>
                                  <select
                                    value={selectedItem.extractedData.type}
                                    onChange={e => handleUpdateCurrentField('type', e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs font-bold outline-none dark:text-white cursor-pointer"
                                  >
                                    {LAW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1">Número / Ano</label>
                                  <input 
                                    type="text" 
                                    value={selectedItem.extractedData.number}
                                    onChange={e => handleUpdateCurrentField('number', e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs font-bold outline-none dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1">Área Temática</label>
                                  <select
                                    value={selectedItem.extractedData.category || 'Administração Geral'}
                                    onChange={e => handleUpdateCurrentField('category', e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs font-bold outline-none dark:text-white cursor-pointer"
                                  >
                                    {LAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1">Título Descritivo / Assunto Principal</label>
                                <input 
                                  type="text" 
                                  value={selectedItem.extractedData.title}
                                  onChange={e => handleUpdateCurrentField('title', e.target.value)}
                                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs font-bold outline-none dark:text-white"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1">Data de Publicação</label>
                                  <input 
                                    type="date" 
                                    value={selectedItem.extractedData.publication_date}
                                    onChange={e => handleUpdateCurrentField('publication_date', e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs outline-none dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1">Poder de Origem</label>
                                  <select
                                    value={selectedItem.extractedData.origin_power}
                                    onChange={e => handleUpdateCurrentField('origin_power', e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs font-bold outline-none dark:text-white cursor-pointer"
                                  >
                                    <option value="executivo">Poder Executivo (Prefeitura)</option>
                                    <option value="legislativo">Poder Legislativo (Câmara Municipal)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1">Autor / Signatário</label>
                                  <input 
                                    type="text" 
                                    value={selectedItem.extractedData.author || ''}
                                    onChange={e => handleUpdateCurrentField('author', e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs outline-none dark:text-white"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm text-neutral-600 dark:text-neutral-400">Nenhum item selecionado</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Selecione uma norma na coluna da esquerda para inspecionar a folha A4.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RODAPÉ DO MODAL */}
          <div className="p-4 sm:px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/95 dark:bg-neutral-900/95 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span>
                Todas as normas são salvas com <strong>texto integral, tabelas orçamentárias e PDF original anexado</strong>.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={doneCount === 0 || isSavingAll}
                onClick={handleSaveAll}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSavingAll ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                <span>Publicar no Acervo ({doneCount} {doneCount === 1 ? 'Norma' : 'Normas'})</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
