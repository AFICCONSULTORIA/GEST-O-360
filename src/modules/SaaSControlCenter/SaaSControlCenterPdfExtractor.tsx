import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, Sparkles, UploadCloud, FileText, CheckCircle2, 
  AlertTriangle, Trash2, Plus, Download, Copy, RefreshCw, X, 
  Search, Edit3, ArrowRight, Check, Eye, HelpCircle, Layers, 
  Sliders, Settings2, ShieldCheck, Database, Table, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../components/ui/Toast';
import { 
  EXTRACTION_PRESETS, 
  ExtractionPreset, 
  ExtractionResult, 
  extractDataFromPdfWithGemini 
} from '../../lib/geminiPdfExtractor';
import { 
  exportToExcel, 
  exportToCsv, 
  copyToClipboardAsTsv 
} from '../../lib/excelExport';

interface SaaSControlCenterPdfExtractorProps {
  darkMode?: boolean;
}

export const SaaSControlCenterPdfExtractor: React.FC<SaaSControlCenterPdfExtractorProps> = () => {
  // Configurações e Presets
  const [selectedPresetId, setSelectedPresetId] = useState<string>('auto');
  const [customColumns, setCustomColumns] = useState<string[]>(['Nome', 'CPF/CNPJ', 'Descrição', 'Valor (R$)', 'Data']);
  const [newColumnInput, setNewColumnInput] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [apiKeyOverride, setApiKeyOverride] = useState<string>('');
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Arquivos e Fila
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status de Processamento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);

  // Dados Extraídos
  const [extractedColumns, setExtractedColumns] = useState<string[]>([]);
  const [extractedRows, setExtractedRows] = useState<Record<string, any>[]>([]);
  const [extractionSummary, setExtractionSummary] = useState<string>('');
  const [sourceFileName, setSourceFileName] = useState<string>('');

  // Tabela e Edição
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Obter o preset ativo
  const activePreset = EXTRACTION_PRESETS.find(p => p.id === selectedPresetId) || EXTRACTION_PRESETS[0];

  // Adicionar coluna customizada
  const handleAddCustomColumn = () => {
    const trimmed = newColumnInput.trim();
    if (!trimmed) return;
    if (customColumns.includes(trimmed)) {
      showToast('Esta coluna já existe na lista!', 'warning');
      return;
    }
    setCustomColumns([...customColumns, trimmed]);
    setNewColumnInput('');
  };

  // Remover coluna customizada
  const handleRemoveCustomColumn = (colToRemove: string) => {
    setCustomColumns(customColumns.filter(c => c !== colToRemove));
  };

  // Gerenciamento de Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files) as File[];
      const pdfFiles = fileList.filter((f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (pdfFiles.length === 0) {
        showToast('Por favor, selecione apenas arquivos em formato PDF.', 'error');
        return;
      }
      setFiles(prev => [...prev, ...pdfFiles]);
      showToast(`${pdfFiles.length} arquivo(s) PDF adicionado(s)!`, 'success');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files) as File[];
      const pdfFiles = fileList.filter((f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (pdfFiles.length === 0) {
        showToast('Por favor, selecione apenas arquivos em formato PDF.', 'error');
        return;
      }
      setFiles(prev => [...prev, ...pdfFiles]);
      showToast(`${pdfFiles.length} arquivo(s) PDF adicionado(s)!`, 'success');
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Executar Extração com Gemini
  const handleStartExtraction = async () => {
    if (files.length === 0) {
      showToast('Selecione pelo menos um arquivo PDF para iniciar a extração.', 'warning');
      return;
    }

    setIsProcessing(true);
    setCurrentFileIndex(0);
    setProcessingProgress('Inicializando leitura e IA...');

    try {
      let combinedRows: Record<string, any>[] = [];
      let consolidatedColumnsSet = new Set<string>();
      let fileSummaries: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        setProcessingProgress(`Analisando arquivo ${i + 1} de ${files.length}: ${file.name}...`);

        const targetCols = selectedPresetId === 'custom' 
          ? customColumns 
          : (activePreset.defaultColumns.length > 0 ? activePreset.defaultColumns : undefined);

        const result: ExtractionResult = await extractDataFromPdfWithGemini(
          file,
          selectedPresetId,
          targetCols,
          customPrompt,
          apiKeyOverride
        );

        result.columns.forEach(c => consolidatedColumnsSet.add(c));
        
        // Se houver múltiplos arquivos, adiciona o nome do arquivo de origem
        const rowsWithOrigin = result.data.map(row => ({
          ...(files.length > 1 ? { 'Arquivo de Origem': file.name } : {}),
          ...row
        }));

        if (files.length > 1) {
          consolidatedColumnsSet.add('Arquivo de Origem');
        }

        combinedRows = [...combinedRows, ...rowsWithOrigin];
        if (result.summary) fileSummaries.push(result.summary);
      }

      let finalCols = Array.from(consolidatedColumnsSet);
      if (files.length > 1 && finalCols.includes('Arquivo de Origem')) {
        finalCols = ['Arquivo de Origem', ...finalCols.filter(c => c !== 'Arquivo de Origem')];
      }

      setExtractedColumns(finalCols);
      setExtractedRows(combinedRows);
      setExtractionSummary(fileSummaries.join(' | ') || `Extração concluída com sucesso. ${combinedRows.length} registros identificados.`);
      setSourceFileName(files.map(f => f.name.replace('.pdf', '')).join('_'));

      showToast(`Sucesso! ${combinedRows.length} registros extraídos com alta fidelidade.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao processar PDF com a IA.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingProgress('');
    }
  };

  // Edição de Célula Inline
  const handleCellChange = (rowIdx: number, colKey: string, value: string) => {
    const updated = [...extractedRows];
    updated[rowIdx] = {
      ...updated[rowIdx],
      [colKey]: value
    };
    setExtractedRows(updated);
  };

  // Excluir Linha
  const handleDeleteRow = (rowIdx: number) => {
    const updated = extractedRows.filter((_, idx) => idx !== rowIdx);
    setExtractedRows(updated);
    showToast('Linha removida.', 'info');
  };

  // Adicionar Nova Linha
  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    extractedColumns.forEach(col => {
      newRow[col] = '';
    });
    setExtractedRows([newRow, ...extractedRows]);
    showToast('Nova linha adicionada no topo da tabela.', 'success');
  };

  // Adicionar Nova Coluna na Tabela Extraída
  const handleAddColumnToTable = () => {
    const colName = prompt('Digite o nome da nova coluna:');
    if (!colName || !colName.trim()) return;
    const trimmed = colName.trim();
    if (extractedColumns.includes(trimmed)) {
      showToast('Esta coluna já existe!', 'warning');
      return;
    }
    setExtractedColumns([...extractedColumns, trimmed]);
    const updated = extractedRows.map(row => ({
      ...row,
      [trimmed]: ''
    }));
    setExtractedRows(updated);
    showToast(`Coluna "${trimmed}" adicionada com sucesso!`, 'success');
  };

  // Remover Coluna da Tabela Extraída
  const handleRemoveColumnFromTable = (colKey: string) => {
    if (confirm(`Deseja realmente remover a coluna "${colKey}" de todos os registros?`)) {
      setExtractedColumns(extractedColumns.filter(c => c !== colKey));
      const updated = extractedRows.map(row => {
        const copy = { ...row };
        delete copy[colKey];
        return copy;
      });
      setExtractedRows(updated);
      showToast(`Coluna "${colKey}" removida.`, 'info');
    }
  };

  // Exportar para Excel (.xlsx)
  const handleExportExcel = async () => {
    if (extractedRows.length === 0) {
      showToast('Não há dados para exportar.', 'warning');
      return;
    }

    try {
      await exportToExcel(extractedColumns, extractedRows, {
        fileName: `Extracao_${sourceFileName || 'Gestao360'}`,
        sheetName: activePreset.name.substring(0, 30),
        title: `GESTÃO 360 · ${activePreset.name.toUpperCase()}`,
        subtitle: `Origem: ${files.map(f => f.name).join(', ') || 'Documento PDF'} | Extração realizada em ${new Date().toLocaleString('pt-BR')}`
      });
      showToast('Planilha Excel (.xlsx) gerada e baixada com sucesso!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao gerar planilha Excel: ' + err.message, 'error');
    }
  };

  // Exportar para CSV
  const handleExportCsv = () => {
    if (extractedRows.length === 0) {
      showToast('Não há dados para exportar.', 'warning');
      return;
    }
    exportToCsv(extractedColumns, extractedRows, `Extracao_${sourceFileName || 'Gestao360'}`);
    showToast('Arquivo CSV baixado com sucesso!', 'success');
  };

  // Copiar TSV para Área de Transferência
  const handleCopyClipboard = async () => {
    if (extractedRows.length === 0) {
      showToast('Não há dados para copiar.', 'warning');
      return;
    }
    const success = await copyToClipboardAsTsv(extractedColumns, extractedRows);
    if (success) {
      setCopiedSuccess(true);
      showToast('Dados copiados! Pode colar direto no Excel ou Google Sheets.', 'success');
      setTimeout(() => setCopiedSuccess(false), 3000);
    } else {
      showToast('Não foi possível copiar para a área de transferência.', 'error');
    }
  };

  // Limpar Tudo
  const handleResetAll = () => {
    if (extractedRows.length > 0) {
      if (!confirm('Deseja limpar os arquivos e a tabela extraída atual?')) return;
    }
    setFiles([]);
    setExtractedColumns([]);
    setExtractedRows([]);
    setExtractionSummary('');
    setSearchTerm('');
  };

  // Filtragem de busca na tabela
  const filteredRows = extractedRows.filter(row => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some(val => String(val || '').toLowerCase().includes(term));
  });

  // Estatísticas e Somatórios Rápidos
  const numericSums = React.useMemo(() => {
    const sums: Record<string, number> = {};
    extractedColumns.forEach(col => {
      let total = 0;
      let count = 0;
      extractedRows.forEach(row => {
        const val = row[col];
        if (typeof val === 'number') {
          total += val;
          count++;
        } else if (typeof val === 'string' && /^R\$\s?[\d.,]+$/.test(val.trim())) {
          const num = parseFloat(val.replace('R$', '').trim().replace(/\./g, '').replace(',', '.'));
          if (!isNaN(num)) {
            total += num;
            count++;
          }
        }
      });
      if (count > 0 && count >= extractedRows.length * 0.4) {
        sums[col] = total;
      }
    });
    return sums;
  }, [extractedColumns, extractedRows]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header Banner com Destaque de IA */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-950 to-neutral-950 rounded-3xl p-8 lg:p-10 text-white shadow-2xl border border-purple-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles size={14} className="animate-spin text-purple-300" style={{ animationDuration: '4s' }} />
              Tecnologia Multimodal Gemini
            </div>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
              Leitor & Extrator de PDF para Excel
            </h2>
            <p className="text-sm text-purple-100/80 leading-relaxed">
              Carregue qualquer documento PDF público, diário oficial, empenho ou relatório escaneado. A IA do Gestão 360 extrai os dados em formato tabular estruturado com download direto em <strong className="text-white">Excel (.xlsx)</strong> e <strong className="text-white">CSV</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 backdrop-blur-md transition-all hover:scale-105"
            >
              <Sliders size={15} />
              Configurações Avançadas
            </button>
            {extractedRows.length > 0 && (
              <button
                onClick={handleResetAll}
                className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 backdrop-blur-md transition-all"
              >
                <Trash2 size={15} />
                Limpar Dados
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drawer de Configurações Avançadas (Opcional) */}
      <AnimatePresence>
        {showConfigDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                  <Settings2 size={18} />
                  <span>Ajustes Técnicos de Extração</span>
                </div>
                <button onClick={() => setShowConfigDrawer(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                    Instrução Personalizada para a IA (Prompt Adicional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Ignore os rodapés das páginas. Extraia apenas as linhas onde o campo 'Status' for 'Homologado'..."
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    className="w-full p-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-purple-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                    Chave de API Gemini Opcional (Override)
                  </label>
                  <input
                    type="password"
                    placeholder="Deixe em branco para usar a chave nativa do Gestão 360"
                    value={apiKeyOverride}
                    onChange={e => setApiKeyOverride(e.target.value)}
                    className="w-full p-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-purple-600 dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1.5">
                    O sistema já possui a chave do Gemini configurada por padrão no ambiente.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Principal: 1. Presets e Colunas | 2. Upload e Arquivos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Lado Esquerdo (5 Colunas): Seleção de Modelo & Campos */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center font-black">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Selecione o Modelo de Extração</h3>
                <p className="text-xs text-neutral-400">Escolha um preset governamental ou use detecção automática.</p>
              </div>
            </div>

            {/* Lista de Presets */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {EXTRACTION_PRESETS.map(preset => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-500 text-neutral-900 dark:text-white shadow-sm ring-1 ring-purple-500/30'
                        : 'bg-neutral-50/50 dark:bg-neutral-850/50 border-neutral-200/70 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold leading-tight">{preset.name}</span>
                        {preset.id === 'auto' && (
                          <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Editor de Colunas Customizadas (se Custom ou para visualizar) */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {selectedPresetId === 'custom' ? 'Definir Colunas Personalizadas:' : 'Colunas Mapeadas neste Modelo:'}
                </label>
                {selectedPresetId !== 'custom' && (
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                    {activePreset.defaultColumns.length > 0 ? `${activePreset.defaultColumns.length} campos` : 'Auto-detect'}
                  </span>
                )}
              </div>

              {selectedPresetId === 'custom' ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome do campo (ex: CPF, Salário, Data)"
                      value={newColumnInput}
                      onChange={e => setNewColumnInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomColumn())}
                      className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600 dark:text-white"
                    />
                    <button
                      onClick={handleAddCustomColumn}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={14} />
                      Adicionar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {customColumns.map(col => (
                      <span
                        key={col}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl"
                      >
                        {col}
                        <button onClick={() => handleRemoveCustomColumn(col)} className="hover:text-rose-500">
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activePreset.defaultColumns.length > 0 ? (
                    activePreset.defaultColumns.map(col => (
                      <span
                        key={col}
                        className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[11px] font-medium rounded-lg"
                      >
                        {col}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-neutral-400">
                      As colunas serão geradas automaticamente de acordo com as tabelas identificadas no PDF pela IA.
                    </span>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Lado Direito (7 Colunas): Upload & Processamento */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6 flex flex-col justify-between min-h-[460px]">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center font-black">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">Carregue os Arquivos PDF</h3>
                    <p className="text-xs text-neutral-400">Suporte a múltiplos arquivos ou PDFs com várias páginas.</p>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  <Plus size={14} />
                  Selecionar PDF
                </button>
              </div>

              {/* Zona de Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 scale-[1.01]'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-purple-400 dark:hover:border-purple-600 bg-neutral-50/40 dark:bg-neutral-850/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                  <UploadCloud size={32} />
                </div>

                <div>
                  <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    Arraste e solte seus arquivos PDF aqui
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Ou clique para navegar pelo seu computador
                  </p>
                </div>
              </div>

              {/* Lista de Arquivos Carregados */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500">
                    <span>Fila de Documentos ({files.length})</span>
                    <button onClick={() => setFiles([])} className="text-rose-500 hover:underline text-[11px]">
                      Remover Todos
                    </button>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 font-bold">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-800 dark:text-neutral-100 truncate max-w-xs">{file.name}</p>
                            <p className="text-[10px] text-neutral-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Ação: Iniciar Leitura & Extração */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
              {isProcessing && (
                <div className="space-y-2 bg-purple-50 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/40">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      {processingProgress}
                    </span>
                    <span>Arquivo {currentFileIndex} de {files.length}</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentFileIndex / Math.max(files.length, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleStartExtraction}
                disabled={isProcessing || files.length === 0}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-purple-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Processando com IA Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Extrair Dados do PDF com IA
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Seção de Resultados / Tabela Interativa de Dados Extraídos */}
      {extractedRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          
          {/* Barra de Ferramentas e Estatísticas da Tabela */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                    Dados Extraídos ({filteredRows.length} {filteredRows.length === 1 ? 'registro' : 'registros'})
                  </h3>
                  <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 size={12} /> Pronto para Exportação
                  </span>
                </div>
                {extractionSummary && (
                  <p className="text-xs text-neutral-400 mt-1">
                    {extractionSummary}
                  </p>
                )}
              </div>

              {/* Botões de Ação & Exportação */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleExportExcel}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all"
                >
                  <FileSpreadsheet size={16} />
                  Baixar Excel (.xlsx)
                </button>

                <button
                  onClick={handleExportCsv}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                >
                  <Download size={15} />
                  CSV
                </button>

                <button
                  onClick={handleCopyClipboard}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                >
                  {copiedSuccess ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  {copiedSuccess ? 'Copiado!' : 'Copiar TSV'}
                </button>

                <button
                  onClick={handleAddRow}
                  className="px-3.5 py-3 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100 transition-all"
                  title="Adicionar Nova Linha"
                >
                  <Plus size={15} />
                  Linha
                </button>

                <button
                  onClick={handleAddColumnToTable}
                  className="px-3.5 py-3 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100 transition-all"
                  title="Adicionar Nova Coluna"
                >
                  <Table size={15} />
                  Coluna
                </button>
              </div>
            </div>

            {/* Barra de Busca e Filtro */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Pesquisar nos registros extraídos..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600 dark:text-white"
                />
              </div>

              {/* Somatórios rápidos */}
              {Object.keys(numericSums).length > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {Object.entries(numericSums).map(([col, total]) => (
                    <div key={col} className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 flex items-center gap-2">
                      <span className="text-neutral-500 dark:text-neutral-400 font-medium">Total {col}:</span>
                      <strong className="text-purple-700 dark:text-purple-300 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(total))}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabela Interativa de Dados com Edição Inline */}
            <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900 text-white dark:bg-neutral-950 border-b border-neutral-800">
                    <th className="p-3.5 w-12 text-center text-neutral-400 font-bold">#</th>
                    {extractedColumns.map(col => (
                      <th key={col} className="p-3.5 font-bold tracking-wide group relative min-w-[140px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{col}</span>
                          <button
                            onClick={() => handleRemoveColumnFromTable(col)}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-400 p-0.5 rounded transition-all"
                            title={`Remover coluna "${col}"`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="p-3.5 w-16 text-center font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                  {filteredRows.map((row, rowIdx) => (
                    <tr 
                      key={rowIdx} 
                      className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors"
                    >
                      <td className="p-3.5 text-center text-neutral-400 font-mono font-medium">
                        {rowIdx + 1}
                      </td>

                      {extractedColumns.map(col => {
                        const cellVal = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
                        const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.colKey === col;

                        return (
                          <td 
                            key={col} 
                            className="p-2.5 text-neutral-800 dark:text-neutral-200 relative group cursor-text"
                            onClick={() => setEditingCell({ rowIdx, colKey: col })}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                type="text"
                                value={cellVal}
                                onChange={e => handleCellChange(rowIdx, col, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    setEditingCell(null);
                                  }
                                }}
                                className="w-full p-1.5 bg-purple-50 dark:bg-neutral-800 border border-purple-500 rounded text-xs outline-none text-neutral-900 dark:text-white"
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate max-w-[280px]" title={cellVal}>
                                  {cellVal || <span className="text-neutral-300 dark:text-neutral-600 italic">vazio</span>}
                                </span>
                                <Edit3 size={11} className="text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleDeleteRow(rowIdx)}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                          title="Excluir linha"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-400 pt-2">
              <span>💡 Dica: Clique em qualquer célula da tabela para editar o texto antes de exportar.</span>
              <span>Total de linhas: {filteredRows.length}</span>
            </div>

          </div>
        </motion.div>
      )}

    </div>
  );
};
