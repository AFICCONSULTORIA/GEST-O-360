import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, Sparkles, FileSpreadsheet, Search, Trash2,
  CheckCircle2, Table as TableIcon, Calculator, Download,
  RefreshCw, ChevronDown, ChevronUp, Database, X, Edit3,
  Save, Undo2, Plus, Percent, ArrowRight, ArrowDown,
  Maximize2, Minimize2, HelpCircle
} from 'lucide-react';
import { showToast } from '../../../components/ui/Toast';
import {
  extractSalaryTablesFromPdf,
  ExtractedSalaryLaw
} from '../../../lib/geminiPdfExtractor';
import { exportToExcel } from '../../../lib/excelExport';
import {
  SalaryLawRecord,
  SalaryTableRecord,
  SalaryEntryRecord,
  fetchSalaryLaws,
  fetchSalaryTablesByLaw,
  saveExtractedSalaryLaw,
  deleteSalaryLaw,
  updateSalaryTableWithEntries
} from '../../../services/salaryTablesService';
import {
  CLASS_KEYS,
  ClassKey,
  getEntryClassValue,
  setEntryClassValue,
  evaluateCellInput,
  parseBrazilianNumber,
  applyPercentageAdjustment,
  applyHorizontalProgression,
  applyVerticalProgression,
  applyNewBaseSalaryAndRecalculate
} from '../utils/salaryFormulaEngine';

interface SalaryTablesManagerProps {
  institutionId: string;
  userName?: string;
}

const formatBRL = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatEditableNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toFixed(2).replace('.', ',');
};

export const SalaryTablesManager: React.FC<SalaryTablesManagerProps> = ({
  institutionId,
  userName
}) => {
  const [laws, setLaws] = useState<SalaryLawRecord[]>([]);
  const [selectedLawId, setSelectedLawId] = useState<string>('');
  const [tables, setTables] = useState<SalaryTableRecord[]>([]);
  const [undoSnapshot, setUndoSnapshot] = useState<SalaryTableRecord[] | null>(null);
  const [dirtyTableIds, setDirtyTableIds] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState<boolean>(true);
  const [isSavingEdits, setIsSavingEdits] = useState<boolean>(false);

  // Extrator de PDF
  const [showExtractor, setShowExtractor] = useState<boolean>(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extraInstructions, setExtraInstructions] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSavingImport, setIsSavingImport] = useState<boolean>(false);
  const [previewLaw, setPreviewLaw] = useState<ExtractedSalaryLaw | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Busca, Edição & Planilha
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [collapsedTables, setCollapsedTables] = useState<Record<string, boolean>>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [focusedTableId, setFocusedTableId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    tableId: string;
    entryId: string;
    field: ClassKey | 'level_code' | 'level_percent';
    rawValue: string;
  } | null>(null);
  const [showFormulaHelp, setShowFormulaHelp] = useState<boolean>(false);

  // Controles de Fórmulas Rápidas (1 clique)
  const [reajustePercent, setReajustePercent] = useState<string>('5');
  const [horizontalStepPercent, setHorizontalStepPercent] = useState<string>('5');
  const [newBaseSalaryInput, setNewBaseSalaryInput] = useState<string>('');

  // Simulador de Enquadramento
  const [simTableId, setSimTableId] = useState<string>('');
  const [simLevel, setSimLevel] = useState<string>('');
  const [simClass, setSimClass] = useState<ClassKey>('A');

  const loadLaws = async () => {
    setIsLoading(true);
    try {
      const { laws: loadedLaws, fromSupabase } = await fetchSalaryLaws(institutionId);
      setLaws(loadedLaws);
      setIsSupabaseSynced(fromSupabase);
      if (loadedLaws.length > 0) {
        const targetId = loadedLaws.some(l => l.id === selectedLawId) ? selectedLawId : loadedLaws[0].id;
        setSelectedLawId(targetId);
      } else {
        setSelectedLawId('');
        setTables([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLaws();
  }, [institutionId]);

  useEffect(() => {
    if (!selectedLawId) {
      setTables([]);
      return;
    }
    let active = true;
    (async () => {
      const { tables: loadedTables, fromSupabase } = await fetchSalaryTablesByLaw(institutionId, selectedLawId);
      if (!active) return;
      setTables(loadedTables);
      setDirtyTableIds({});
      setUndoSnapshot(null);
      setIsSupabaseSynced(fromSupabase);
      if (loadedTables.length > 0) {
        setSimTableId(loadedTables[0].id);
        setSimLevel(loadedTables[0].entries[0]?.level_code || 'REF.');
      }
    })();
    return () => {
      active = false;
    };
  }, [institutionId, selectedLawId]);

  const pushUndo = (current: SalaryTableRecord[]) => {
    setUndoSnapshot(JSON.parse(JSON.stringify(current)));
  };

  const handleUndo = () => {
    if (!undoSnapshot) return;
    setTables(undoSnapshot);
    const allDirty: Record<string, boolean> = {};
    undoSnapshot.forEach(t => { allDirty[t.id] = true; });
    setDirtyTableIds(allDirty);
    setUndoSnapshot(null);
    showToast('Última alteração de fórmula desfeita.', 'info');
  };

  const markDirty = (tableId: string) => {
    setDirtyTableIds(prev => ({ ...prev, [tableId]: true }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Selecione um arquivo PDF válido.', 'error');
      return;
    }
    setPdfFile(file);
    setPreviewLaw(null);
  };

  const handleRunExtraction = async () => {
    if (!pdfFile) {
      showToast('Selecione o PDF da Tabela de Vencimentos primeiro.', 'warning');
      return;
    }
    setIsExtracting(true);
    try {
      const extracted = await extractSalaryTablesFromPdf(pdfFile, extraInstructions);
      if (extracted.tables.length === 0) {
        showToast('Nenhuma tabela de vencimentos foi identificada no PDF.', 'warning');
      } else {
        showToast(`${extracted.tables.length} tabela(s) extraída(s) com sucesso! Confira antes de salvar.`, 'success');
      }
      setPreviewLaw(extracted);
    } catch (err: any) {
      showToast(err.message || 'Erro ao extrair tabelas do PDF.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmSavePreview = async () => {
    if (!previewLaw || previewLaw.tables.length === 0) return;
    setIsSavingImport(true);
    try {
      const { law, tables: savedTables, savedToSupabase } = await saveExtractedSalaryLaw(
        institutionId,
        previewLaw,
        userName
      );
      setLaws(prev => [law, ...prev]);
      setSelectedLawId(law.id);
      setTables(savedTables);
      setIsSupabaseSynced(savedToSupabase);
      setPreviewLaw(null);
      setPdfFile(null);
      setShowExtractor(false);
      showToast(
        savedToSupabase
          ? `${savedTables.length} tabelas salvas no banco de dados!`
          : `${savedTables.length} tabelas salvas localmente (execute a migração no Supabase para sincronizar).`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar tabelas extraídas.', 'error');
    } finally {
      setIsSavingImport(false);
    }
  };

  const handleDeleteLaw = async (lawId: string) => {
    const target = laws.find(l => l.id === lawId);
    if (!target) return;
    await deleteSalaryLaw(institutionId, lawId);
    const remaining = laws.filter(l => l.id !== lawId);
    setLaws(remaining);
    setSelectedLawId(remaining[0]?.id || '');
    showToast(`"${target.title}" removida.`, 'success');
  };

  const handleSaveAllDirtyTables = async () => {
    const dirtyIds = Object.keys(dirtyTableIds).filter(id => dirtyTableIds[id]);
    if (dirtyIds.length === 0) {
      showToast('Não há alterações pendentes para salvar.', 'info');
      return;
    }

    setIsSavingEdits(true);
    let synced = true;
    try {
      for (const id of dirtyIds) {
        const table = tables.find(t => t.id === id);
        if (!table) continue;
        const res = await updateSalaryTableWithEntries(institutionId, table);
        if (!res.savedToSupabase) synced = false;
      }
      setDirtyTableIds({});
      setIsSupabaseSynced(synced);
      showToast(
        synced
          ? `${dirtyIds.length} tabela(s) salva(s) no Supabase!`
          : `${dirtyIds.length} tabela(s) salva(s) no cache local.`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Erro ao salvar alterações.', 'error');
    } finally {
      setIsSavingEdits(false);
    }
  };

  const commitEditingCell = () => {
    if (!editingCell) return;
    const { tableId, entryId, field, rawValue } = editingCell;

    const targetTable = tables.find(t => t.id === tableId);
    if (!targetTable) {
      setEditingCell(null);
      return;
    }

    pushUndo(tables);

    const refRow = targetTable.entries.find(e => e.level_code.toUpperCase().startsWith('REF')) || targetTable.entries[0];
    const baseValue = refRow ? getEntryClassValue(refRow, 'A') : targetTable.base_salary;

    const updatedTables = tables.map(t => {
      if (t.id !== tableId) return t;
      const entries = t.entries.map(entry => {
        if (entry.id !== entryId) return entry;
        if (field === 'level_code' || field === 'level_percent') {
          return { ...entry, [field]: rawValue.trim() };
        }
        const evaluated = evaluateCellInput(rawValue, {
          baseValue,
          entry,
          colCode: field
        });
        if (rawValue.trim() && evaluated === null) {
          showToast('Fórmula ou número inválido. Ex: 1980,00 ou =A*1.05', 'warning');
          return entry;
        }
        return setEntryClassValue(entry, field, evaluated);
      });
      const updatedRef = entries.find(e => e.level_code.toUpperCase().startsWith('REF')) || entries[0];
      return { ...t, base_salary: updatedRef?.class_a ?? t.base_salary, entries };
    });

    setTables(updatedTables);
    markDirty(tableId);
    setEditingCell(null);
  };

  const handleUpdateRoleName = (tableId: string, roleName: string) => {
    setTables(prev => prev.map(t => (t.id === tableId ? { ...t, role_name: roleName } : t)));
    markDirty(tableId);
  };

  const handleAddLevelRow = (tableId: string) => {
    pushUndo(tables);
    setTables(prev =>
      prev.map(t => {
        if (t.id !== tableId) return t;
        const lastRow = t.entries[t.entries.length - 1];
        const newEntry: SalaryEntryRecord = {
          id: crypto.randomUUID(),
          salary_table_id: t.id,
          level_code: `NÍVEL ${t.entries.length}`,
          level_order: t.entries.length,
          level_percent: '5%',
          class_a: lastRow?.class_a ?? null,
          class_b: lastRow?.class_b ?? null,
          class_c: lastRow?.class_c ?? null,
          class_d: lastRow?.class_d ?? null,
          class_e: lastRow?.class_e ?? null,
          class_f: lastRow?.class_f ?? null,
          class_g: lastRow?.class_g ?? null,
          class_h: lastRow?.class_h ?? null
        };
        return { ...t, entries: [...t.entries, newEntry] };
      })
    );
    markDirty(tableId);
  };

  const handleRemoveLevelRow = (tableId: string, entryId: string) => {
    pushUndo(tables);
    setTables(prev =>
      prev.map(t => {
        if (t.id !== tableId) return t;
        return { ...t, entries: t.entries.filter(e => e.id !== entryId) };
      })
    );
    markDirty(tableId);
  };

  // --- BOTÕES DE FÓRMULAS SIMPLIFICADAS ---
  const getTargetTablesForFormula = (applyAll: boolean): SalaryTableRecord[] => {
    if (applyAll) return tables;
    if (focusedTableId) return tables.filter(t => t.id === focusedTableId);
    return filteredTables;
  };

  const handleFormulaReajuste = (applyAll: boolean) => {
    const pct = parseFloat(reajustePercent.replace(',', '.'));
    if (Number.isNaN(pct)) {
      showToast('Informe um percentual válido para reajuste.', 'warning');
      return;
    }
    const targets = getTargetTablesForFormula(applyAll);
    if (targets.length === 0) return;

    pushUndo(tables);
    const targetIds = new Set(targets.map(t => t.id));
    setTables(prev => prev.map(t => (targetIds.has(t.id) ? applyPercentageAdjustment(t, pct) : t)));
    targets.forEach(t => markDirty(t.id));
    showToast(`Reajuste de ${pct > 0 ? '+' : ''}${pct}% aplicado em ${targets.length} tabela(s)!`, 'success');
  };

  const handleFormulaHorizontal = (mode: 'compound' | 'simple_over_a', applyAll: boolean) => {
    const step = parseFloat(horizontalStepPercent.replace(',', '.'));
    if (Number.isNaN(step)) {
      showToast('Informe um percentual de progressão válido.', 'warning');
      return;
    }
    const targets = getTargetTablesForFormula(applyAll);
    if (targets.length === 0) return;

    pushUndo(tables);
    const targetIds = new Set(targets.map(t => t.id));
    setTables(prev => prev.map(t => (targetIds.has(t.id) ? applyHorizontalProgression(t, step, mode) : t)));
    targets.forEach(t => markDirty(t.id));
    showToast(
      `Progressão horizontal (${mode === 'compound' ? 'composta' : 'sobre Classe A'} +${step}%) aplicada em ${targets.length} tabela(s)!`,
      'success'
    );
  };

  const handleFormulaVertical = (applyAll: boolean) => {
    const targets = getTargetTablesForFormula(applyAll);
    if (targets.length === 0) return;

    pushUndo(tables);
    const targetIds = new Set(targets.map(t => t.id));
    setTables(prev => prev.map(t => (targetIds.has(t.id) ? applyVerticalProgression(t) : t)));
    targets.forEach(t => markDirty(t.id));
    showToast(`Progressão vertical (Por% sobre REF.) recalculada em ${targets.length} tabela(s)!`, 'success');
  };

  const handleFormulaNewBaseSalary = () => {
    const newBase = parseBrazilianNumber(newBaseSalaryInput);
    const step = parseFloat(horizontalStepPercent.replace(',', '.')) || 5;
    if (newBase === null || newBase <= 0) {
      showToast('Informe um valor válido para o novo Salário Base (ex: 2100,00).', 'warning');
      return;
    }
    const targetId = focusedTableId || filteredTables[0]?.id;
    if (!targetId) return;

    pushUndo(tables);
    setTables(prev =>
      prev.map(t => (t.id === targetId ? applyNewBaseSalaryAndRecalculate(t, newBase, step) : t))
    );
    markDirty(targetId);
    showToast(`Salário Base definido para ${formatBRL(newBase)} e matriz recalculada!`, 'success');
  };

  const handleExportLawExcel = async () => {
    if (tables.length === 0) {
      showToast('Não há tabelas para exportar.', 'warning');
      return;
    }
    const activeLaw = laws.find(l => l.id === selectedLawId);
    const columns = ['Tabela', 'Cargo', 'Nível', 'Por%', 'Classe A', 'Classe B', 'Classe C', 'Classe D', 'Classe E', 'Classe F', 'Classe G', 'Classe H'];
    const rows: Record<string, any>[] = [];

    tables.forEach(t => {
      t.entries.forEach(e => {
        rows.push({
          'Tabela': `TABELA ${t.table_roman}`,
          'Cargo': t.role_name,
          'Nível': e.level_code,
          'Por%': e.level_percent,
          'Classe A': e.class_a ?? '',
          'Classe B': e.class_b ?? '',
          'Classe C': e.class_c ?? '',
          'Classe D': e.class_d ?? '',
          'Classe E': e.class_e ?? '',
          'Classe F': e.class_f ?? '',
          'Classe G': e.class_g ?? '',
          'Classe H': e.class_h ?? ''
        });
      });
    });

    await exportToExcel(columns, rows, {
      fileName: `Tabelas_Vencimentos_${activeLaw?.law_number?.replace(/[^\w]/g, '_') || 'Lei'}`,
      sheetName: 'Tabelas de Vencimentos',
      title: activeLaw?.title || 'TABELAS DE VENCIMENTOS',
      subtitle: `${activeLaw?.annex_name || ''} • ${tables.length} cargos • Exportado pelo Gestão 360`,
      headerColor: 'FF003B6F'
    });
    showToast('Planilha Excel gerada com sucesso!', 'success');
  };

  const filteredTables = tables.filter(t => {
    if (focusedTableId && t.id !== focusedTableId) return false;
    return (
      t.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.table_roman.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const dirtyCount = Object.values(dirtyTableIds).filter(Boolean).length;
  const simSelectedTable = tables.find(t => t.id === simTableId);
  const simSelectedEntry = simSelectedTable?.entries.find(e => e.level_code === simLevel) || simSelectedTable?.entries[0];
  const simCalculatedValue = simSelectedEntry ? getEntryClassValue(simSelectedEntry, simClass) : null;
  const simClassMeta = simSelectedTable?.classes_metadata?.find(c => c.code === simClass);

  return (
    <div className="space-y-5">
      {/* Cabeçalho e Ações Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-[#003B6F] dark:text-blue-400" />
            Tabelas de Vencimentos & Planos de Cargos
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-2">
            Ambiente completo de edição e fórmulas para tabelas salariais municipais.
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isSupabaseSynced
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
            }`}>
              <Database className="w-3 h-3" />
              {isSupabaseSynced ? 'Tabela Própria Supabase' : 'Cache Local'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dirtyCount > 0 && (
            <button
              onClick={handleSaveAllDirtyTables}
              disabled={isSavingEdits}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm animate-pulse"
            >
              <Save className="w-4 h-4" />
              {isSavingEdits ? 'Salvando...' : `Salvar Alterações (${dirtyCount})`}
            </button>
          )}
          {undoSnapshot && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all"
            >
              <Undo2 className="w-4 h-4" />
              Desfazer
            </button>
          )}
          {tables.length > 0 && (
            <>
              <button
                onClick={() => setIsEditMode(prev => !prev)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isEditMode
                    ? 'bg-blue-50 border-blue-300 text-[#003B6F] dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300'
                    : 'bg-white border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                {isEditMode ? 'Edição & Fórmulas Ativas' : 'Modo Leitura'}
              </button>
              <button
                onClick={handleExportLawExcel}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
            </>
          )}
          <button
            onClick={() => setShowExtractor(prev => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-[#003B6F] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            {showExtractor ? 'Fechar Extrator IA' : 'Importar PDF com IA'}
          </button>
        </div>
      </div>

      {/* Painel do Extrator de PDF com IA */}
      {showExtractor && (
        <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-[#003B6F] dark:text-blue-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Extrator Especializado de Tabelas de Vencimentos
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Envie o PDF da Lei Municipal / Anexo (ex: Anexo IV - Lei nº 44/2022) para estruturar automaticamente todas as tabelas por cargo, níveis e classes.
              </p>
            </div>
            <button onClick={() => setShowExtractor(false)} className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-5 text-center cursor-pointer hover:bg-white/60 dark:hover:bg-neutral-900/40 transition-all"
            >
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />
              <UploadCloud className="w-8 h-8 text-[#003B6F] dark:text-blue-400 mx-auto mb-2" />
              {pdfFile ? (
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">{pdfFile.name}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Clique para selecionar o PDF das Tabelas de Vencimentos</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Suporta PDFs multipágina</p>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                  Instruções Adicionais (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={extraInstructions}
                  onChange={e => setExtraInstructions(e.target.value)}
                  placeholder="Ex: Considerar apenas o Anexo IV; ignorar rodapés de página..."
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleRunExtraction}
                disabled={!pdfFile || isExtracting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B6F] hover:bg-blue-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extraindo tabelas com Gemini IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extrair Tabelas do PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {previewLaw && (
            <div className="bg-white dark:bg-[#171717] border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                  <input
                    type="text"
                    value={previewLaw.lawNumber}
                    onChange={e => setPreviewLaw({ ...previewLaw, lawNumber: e.target.value })}
                    placeholder="Nº da Lei (ex: 44/2022)"
                    className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={previewLaw.annexName}
                    onChange={e => setPreviewLaw({ ...previewLaw, annexName: e.target.value })}
                    placeholder="Anexo (ex: ANEXO IV)"
                    className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={previewLaw.title}
                    onChange={e => setPreviewLaw({ ...previewLaw, title: e.target.value })}
                    placeholder="Título descritivo"
                    className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <button
                  onClick={handleConfirmSavePreview}
                  disabled={isSavingImport || previewLaw.tables.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSavingImport ? 'Salvando...' : `Salvar ${previewLaw.tables.length} Tabela(s)`}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {previewLaw.tables.map((t, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-lg border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-900 dark:text-white mb-1">
                      <span>TABELA {t.tableRoman}: {t.roleName}</span>
                      <span className="text-[11px] text-neutral-500">{t.rows.length} níveis</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Base (REF. / Classe A): <strong className="text-emerald-600 dark:text-emerald-400">{formatBRL(t.rows[0]?.values?.A)}</strong>
                      {' • '}
                      Máximo (Classe H): <strong className="text-blue-600 dark:text-blue-400">{formatBRL(t.rows[t.rows.length - 1]?.values?.H)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de Seleção de Lei + Busca + Expandir/Recolher */}
      {laws.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-neutral-50 dark:bg-neutral-900/40 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="lg:col-span-5 flex items-center gap-2">
            <select
              value={selectedLawId}
              onChange={e => {
                setSelectedLawId(e.target.value);
                setFocusedTableId(null);
              }}
              className="flex-1 px-3 py-2 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none"
            >
              {laws.map(law => (
                <option key={law.id} value={law.id}>
                  {law.annex_name ? `${law.annex_name} — ` : ''}Lei nº {law.law_number} ({law.title})
                </option>
              ))}
            </select>
            <button
              onClick={() => handleDeleteLaw(selectedLawId)}
              title="Excluir lei e suas tabelas"
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar cargo ou tabela (ex: Almoxarife, Motorista, XXIV)..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#003B6F]"
            />
          </div>

          <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
            {focusedTableId ? (
              <button
                onClick={() => setFocusedTableId(null)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#003B6F] text-white rounded-xl text-xs font-bold"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Ver Todas ({tables.length})
              </button>
            ) : (
              <>
                <button
                  onClick={() => setCollapsedTables({})}
                  className="px-2.5 py-2 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 rounded-xl text-[11px] font-bold hover:bg-neutral-100"
                  title="Expandir todas as tabelas"
                >
                  Expandir
                </button>
                <button
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    tables.forEach(t => { next[t.id] = true; });
                    setCollapsedTables(next);
                  }}
                  className="px-2.5 py-2 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 rounded-xl text-[11px] font-bold hover:bg-neutral-100"
                  title="Recolher todas as tabelas"
                >
                  Recolher
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE FÓRMULAS SIMPLIFICADAS (1 CLIQUE) */}
      {tables.length > 0 && isEditMode && (
        <div className="bg-gradient-to-r from-slate-50 via-blue-50/50 to-emerald-50/40 dark:from-neutral-900 dark:via-blue-950/20 dark:to-emerald-950/10 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#003B6F] dark:text-blue-300">
              <Calculator className="w-4 h-4" />
              Botões de Fórmulas Rápidas
              {focusedTableId && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-[#003B6F] dark:text-blue-200 rounded-md text-[10px] font-bold normal-case">
                  Alvo: {tables.find(t => t.id === focusedTableId)?.role_name}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFormulaHelp(prev => !prev)}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showFormulaHelp ? 'Ocultar guia de fórmulas' : 'Como digitar fórmulas nas células?'}
            </button>
          </div>

          {showFormulaHelp && (
            <div className="p-3 bg-white dark:bg-[#171717] rounded-xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-neutral-600 dark:text-neutral-300 space-y-1">
              <p>Clique em qualquer valor da tabela para editar diretamente. Você pode digitar números (ex: <code>2150,00</code>) ou fórmulas iniciadas por <code>=</code>:</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <code className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">=A*1.05</code>
                <code className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">=ANT*1.05</code>
                <code className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">=BASE*1.15</code>
                <code className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">=B+150</code>
                <code className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">=SOMA(A:H)</code>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* 1. Reajuste Geral (%) */}
            <div className="bg-white dark:bg-[#171717] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                Reajuste Linear (%)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={reajustePercent}
                  onChange={e => setReajustePercent(e.target.value)}
                  className="w-16 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold text-center"
                  placeholder="5"
                />
                <button
                  type="button"
                  onClick={() => handleFormulaReajuste(false)}
                  className="flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                >
                  +{reajustePercent}% {focusedTableId ? 'na Tabela' : 'Filtradas'}
                </button>
                <button
                  type="button"
                  onClick={() => handleFormulaReajuste(true)}
                  title="Aplicar em todas as tabelas da lei"
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors"
                >
                  Todas
                </button>
              </div>
            </div>

            {/* 2. Progressão Horizontal (A -> H) */}
            <div className="bg-white dark:bg-[#171717] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                Progressão Horizontal (A → H)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={horizontalStepPercent}
                  onChange={e => setHorizontalStepPercent(e.target.value)}
                  className="w-14 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold text-center"
                  placeholder="5"
                />
                <button
                  type="button"
                  onClick={() => handleFormulaHorizontal('compound', false)}
                  title="Cada classe cresce +X% sobre a classe anterior"
                  className="flex-1 px-2 py-1.5 bg-[#003B6F] hover:bg-blue-900 text-white rounded-lg text-[11px] font-bold transition-colors"
                >
                  Composta +{horizontalStepPercent}%
                </button>
                <button
                  type="button"
                  onClick={() => handleFormulaHorizontal('simple_over_a', false)}
                  title="Cada classe usa 5%, 10%, 15%... sobre a Classe A"
                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003B6F] border border-blue-200 rounded-lg text-[11px] font-bold transition-colors"
                >
                  Sobre A
                </button>
              </div>
            </div>

            {/* 3. Progressão Vertical (REF -> Níveis) */}
            <div className="bg-white dark:bg-[#171717] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                Progressão Vertical (Por%)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleFormulaVertical(false)}
                  className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                >
                  Aplicar Por% s/ REF.
                </button>
                <button
                  type="button"
                  onClick={() => handleFormulaVertical(true)}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-colors"
                >
                  Todas
                </button>
              </div>
            </div>

            {/* 4. Novo Salário Base & Recalcular Tudo */}
            <div className="bg-white dark:bg-[#171717] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-amber-600" />
                Novo Salário Base (REF./A)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newBaseSalaryInput}
                  onChange={e => setNewBaseSalaryInput(e.target.value)}
                  placeholder="Ex: 2100,00"
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={handleFormulaNewBaseSalary}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors"
                >
                  Recalcular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulador Rápido de Enquadramento */}
      {tables.length > 0 && (
        <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#003B6F] dark:text-blue-400 mb-3">
            <Calculator className="w-4 h-4" />
            Simulador de Enquadramento Salarial
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Cargo / Tabela</label>
              <select
                value={simTableId}
                onChange={e => {
                  const nextId = e.target.value;
                  setSimTableId(nextId);
                  const found = tables.find(t => t.id === nextId);
                  if (found && found.entries.length > 0) {
                    setSimLevel(found.entries[0].level_code);
                  }
                }}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold"
              >
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    TABELA {t.table_roman} — {t.role_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Nível (Vertical)</label>
              <select
                value={simLevel}
                onChange={e => setSimLevel(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold"
              >
                {(simSelectedTable?.entries || []).map(e => (
                  <option key={e.id} value={e.level_code}>
                    {e.level_code} ({e.level_percent})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Classe (Tempo de Serviço)</label>
              <select
                value={simClass}
                onChange={e => setSimClass(e.target.value as ClassKey)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold"
              >
                {CLASS_KEYS.map(c => {
                  const meta = simSelectedTable?.classes_metadata?.find(m => m.code === c);
                  return (
                    <option key={c} value={c}>
                      Classe {c} {meta?.years ? `(${meta.years} anos)` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-neutral-500">
              Enquadramento: <strong className="text-neutral-900 dark:text-white">{simSelectedTable?.role_name}</strong>
              {' • '}Nível <strong>{simSelectedEntry?.level_code}</strong>
              {' • '}Classe <strong>{simClass}</strong>
              {simClassMeta?.years ? ` (${simClassMeta.years} anos • ${simClassMeta.percent})` : ''}
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatBRL(simCalculatedValue)}
            </div>
          </div>
        </div>
      )}

      {/* Estado Vazio */}
      {!isLoading && laws.length === 0 && !showExtractor && (
        <div className="text-center py-12 px-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
          <FileSpreadsheet className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-neutral-800 dark:text-white">Nenhuma Tabela de Vencimentos cadastrada</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 mb-4">
            Importe o PDF do Plano de Cargos e Salários (ex: Anexo IV - Lei Municipal nº 44/2022) para editar valores e aplicar fórmulas em toda a matriz.
          </p>
          <button
            onClick={() => setShowExtractor(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B6F] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Importar Primeiro PDF com IA
          </button>
        </div>
      )}

      {/* Lista Completa de Tabelas Editáveis */}
      <div className="space-y-4">
        {filteredTables.map(table => {
          const isCollapsed = !!collapsedTables[table.id] && focusedTableId !== table.id;
          const isDirty = !!dirtyTableIds[table.id];

          return (
            <div
              key={table.id}
              className={`bg-white dark:bg-[#171717] border rounded-2xl overflow-hidden shadow-sm transition-all ${
                isDirty
                  ? 'border-amber-400 dark:border-amber-600 ring-1 ring-amber-300/50'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/80 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                  <span className="px-2.5 py-1 bg-[#003B6F] text-white rounded-lg text-[11px] font-black shrink-0">
                    TABELA {table.table_roman}
                  </span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={table.role_name}
                      onChange={e => handleUpdateRoleName(table.id, e.target.value)}
                      className="text-sm font-black text-neutral-900 dark:text-white bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#003B6F] outline-none px-1 py-0.5 flex-1 max-w-md"
                    />
                  ) : (
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white">{table.role_name}</h4>
                  )}
                  {isDirty && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                      Modificada
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 hidden sm:inline">
                    Base: <strong className="text-emerald-600 dark:text-emerald-400">{formatBRL(table.base_salary)}</strong>
                    {' • '}{table.entries.length} níveis
                  </span>
                  <button
                    type="button"
                    onClick={() => setFocusedTableId(prev => (prev === table.id ? null : table.id))}
                    className="p-1.5 text-neutral-500 hover:text-[#003B6F] hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    title={focusedTableId === table.id ? 'Mostrar todas as tabelas' : 'Focar apenas nesta tabela'}
                  >
                    {focusedTableId === table.id ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollapsedTables(prev => ({ ...prev, [table.id]: !prev[table.id] }))}
                    className="p-1.5 text-neutral-500 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    title={isCollapsed ? 'Expandir tabela' : 'Recolher tabela'}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-neutral-100/80 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800">
                          <th className="py-2.5 px-3 font-black">NÍVEL</th>
                          <th className="py-2.5 px-3 font-black">Por%</th>
                          {CLASS_KEYS.map(code => {
                            const meta = table.classes_metadata?.find(m => m.code === code);
                            return (
                              <th key={code} className="py-2 px-3 text-right font-black whitespace-nowrap">
                                <div>{code} {meta?.percent && meta.percent !== '0%' ? `(${meta.percent})` : ''}</div>
                                {meta?.years && (
                                  <div className="text-[10px] font-normal text-neutral-400">{meta.years}</div>
                                )}
                              </th>
                            );
                          })}
                          {isEditMode && <th className="py-2 px-2 w-8"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {table.entries.map(entry => {
                          const isEditingField = (field: ClassKey | 'level_code' | 'level_percent') =>
                            editingCell?.tableId === table.id &&
                            editingCell?.entryId === entry.id &&
                            editingCell?.field === field;

                          return (
                            <tr
                              key={entry.id}
                              className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                            >
                              {/* NÍVEL */}
                              <td
                                onClick={() =>
                                  isEditMode &&
                                  setEditingCell({
                                    tableId: table.id,
                                    entryId: entry.id,
                                    field: 'level_code',
                                    rawValue: entry.level_code
                                  })
                                }
                                className={`py-2 px-3 font-black text-neutral-900 dark:text-white whitespace-nowrap ${
                                  isEditMode ? 'cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30' : ''
                                }`}
                              >
                                {isEditingField('level_code') ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editingCell.rawValue}
                                    onChange={e => setEditingCell({ ...editingCell, rawValue: e.target.value })}
                                    onBlur={commitEditingCell}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') commitEditingCell();
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    className="w-16 px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-blue-500 rounded text-xs font-black outline-none"
                                  />
                                ) : (
                                  entry.level_code
                                )}
                              </td>

                              {/* Por% */}
                              <td
                                onClick={() =>
                                  isEditMode &&
                                  setEditingCell({
                                    tableId: table.id,
                                    entryId: entry.id,
                                    field: 'level_percent',
                                    rawValue: entry.level_percent
                                  })
                                }
                                className={`py-2 px-3 font-bold text-neutral-500 whitespace-nowrap ${
                                  isEditMode ? 'cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30' : ''
                                }`}
                              >
                                {isEditingField('level_percent') ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editingCell.rawValue}
                                    onChange={e => setEditingCell({ ...editingCell, rawValue: e.target.value })}
                                    onBlur={commitEditingCell}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') commitEditingCell();
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    className="w-14 px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-blue-500 rounded text-xs font-bold outline-none"
                                  />
                                ) : (
                                  entry.level_percent
                                )}
                              </td>

                              {/* CLASSES A..H */}
                              {CLASS_KEYS.map(code => {
                                const val = getEntryClassValue(entry, code);
                                const editingThis = isEditingField(code);
                                return (
                                  <td
                                    key={code}
                                    onClick={() =>
                                      isEditMode &&
                                      !editingThis &&
                                      setEditingCell({
                                        tableId: table.id,
                                        entryId: entry.id,
                                        field: code,
                                        rawValue: formatEditableNumber(val)
                                      })
                                    }
                                    className={`py-2 px-3 text-right font-mono font-medium text-neutral-800 dark:text-neutral-200 whitespace-nowrap ${
                                      isEditMode ? 'cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/30' : ''
                                    }`}
                                  >
                                    {editingThis ? (
                                      <input
                                        autoFocus
                                        type="text"
                                        value={editingCell.rawValue}
                                        onChange={e => setEditingCell({ ...editingCell, rawValue: e.target.value })}
                                        onBlur={commitEditingCell}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') commitEditingCell();
                                          if (e.key === 'Escape') setEditingCell(null);
                                        }}
                                        placeholder="0,00 ou =A*1.05"
                                        className="w-24 px-1.5 py-0.5 text-right bg-white dark:bg-neutral-900 border border-blue-500 rounded text-xs font-mono outline-none"
                                      />
                                    ) : (
                                      formatBRL(val)
                                    )}
                                  </td>
                                );
                              })}

                              {isEditMode && (
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLevelRow(table.id, entry.id)}
                                    title="Remover linha de nível"
                                    className="p-1 text-neutral-400 hover:text-rose-500 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {isEditMode && (
                    <div className="px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900/30 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleAddLevelRow(table.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#003B6F] dark:text-blue-400 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Nível
                      </button>
                      <span className="text-[10px] text-neutral-400">
                        Clique em qualquer célula para editar valor ou usar fórmula (=A*1.05, =ANT*1.05, =BASE*1.10)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
