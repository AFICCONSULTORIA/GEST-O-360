import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, Sparkles, FileSpreadsheet, Search, Trash2,
  CheckCircle2, Table as TableIcon, Calculator, Download,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Database, X
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
  deleteSalaryLaw
} from '../../../services/salaryTablesService';

interface SalaryTablesManagerProps {
  institutionId: string;
  userName?: string;
}

const formatBRL = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CLASS_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

function getEntryClassValue(entry: SalaryEntryRecord, classCode: string): number | null {
  const key = `class_${classCode.toLowerCase()}` as keyof SalaryEntryRecord;
  const val = entry[key];
  return typeof val === 'number' ? val : val !== null && val !== undefined ? Number(val) : null;
}

export const SalaryTablesManager: React.FC<SalaryTablesManagerProps> = ({
  institutionId,
  userName
}) => {
  const [laws, setLaws] = useState<SalaryLawRecord[]>([]);
  const [selectedLawId, setSelectedLawId] = useState<string>('');
  const [tables, setTables] = useState<SalaryTableRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState<boolean>(true);

  // Extrator de PDF
  const [showExtractor, setShowExtractor] = useState<boolean>(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extraInstructions, setExtraInstructions] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewLaw, setPreviewLaw] = useState<ExtractedSalaryLaw | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Busca & UI
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [collapsedTables, setCollapsedTables] = useState<Record<string, boolean>>({});

  // Simulador de Enquadramento
  const [simTableId, setSimTableId] = useState<string>('');
  const [simLevel, setSimLevel] = useState<string>('');
  const [simClass, setSimClass] = useState<string>('A');

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
    setIsSaving(true);
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
      setIsSaving(false);
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

  const filteredTables = tables.filter(t =>
    t.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.table_roman.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const simSelectedTable = tables.find(t => t.id === simTableId);
  const simSelectedEntry = simSelectedTable?.entries.find(e => e.level_code === simLevel) || simSelectedTable?.entries[0];
  const simCalculatedValue = simSelectedEntry ? getEntryClassValue(simSelectedEntry, simClass) : null;
  const simClassMeta = simSelectedTable?.classes_metadata?.find(c => c.code === simClass);

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-[#003B6F] dark:text-blue-400" />
            Tabelas de Vencimentos & Planos de Cargos
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
            Extração inteligente de anexos de leis municipais com matriz Nível × Classe.
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isSupabaseSynced
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
            }`}>
              <Database className="w-3 h-3" />
              {isSupabaseSynced ? 'Tabela Própria Supabase' : 'Cache Local (Migração pendente)'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tables.length > 0 && (
            <button
              onClick={handleExportLawExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
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
            <button
              onClick={() => setShowExtractor(false)}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-5 text-center cursor-pointer hover:bg-white/60 dark:hover:bg-neutral-900/40 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-[#003B6F] dark:text-blue-400 mx-auto mb-2" />
              {pdfFile ? (
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">{pdfFile.name}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Clique para selecionar o PDF das Tabelas de Vencimentos
                  </p>
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

          {/* Preview do resultado extraído antes de salvar */}
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
                  disabled={isSaving || previewLaw.tables.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : `Salvar ${previewLaw.tables.length} Tabela(s)`}
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

      {/* Barra de Seleção de Lei + Busca de Cargo */}
      {laws.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="lg:col-span-5 flex items-center gap-2">
            <select
              value={selectedLawId}
              onChange={e => setSelectedLawId(e.target.value)}
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

          <div className="lg:col-span-7 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar cargo ou número da tabela (ex: Almoxarife, Assistente Social, Motorista, XXIV)..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#003B6F]"
            />
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
                onChange={e => setSimClass(e.target.value)}
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
          <h3 className="text-sm font-bold text-neutral-800 dark:text-white">
            Nenhuma Tabela de Vencimentos cadastrada
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 mb-4">
            Importe o PDF do Plano de Cargos e Salários (ex: Anexo IV - Lei Municipal nº 44/2022) para que a IA estruture automaticamente todas as tabelas por cargo.
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

      {/* Lista de Tabelas Extraídas */}
      <div className="space-y-4">
        {filteredTables.map(table => {
          const isCollapsed = !!collapsedTables[table.id];
          return (
            <div
              key={table.id}
              className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm"
            >
              <button
                type="button"
                onClick={() => setCollapsedTables(prev => ({ ...prev, [table.id]: !prev[table.id] }))}
                className="w-full px-5 py-3.5 flex items-center justify-between bg-neutral-50/80 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-left hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-[#003B6F] text-white rounded-lg text-[11px] font-black">
                    TABELA {table.table_roman}
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                      {table.role_name}
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Salário Base (REF. / A): <strong className="text-emerald-600 dark:text-emerald-400">{formatBRL(table.base_salary)}</strong>
                      {' • '}{table.entries.length} níveis
                    </p>
                  </div>
                </div>
                {isCollapsed ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronUp className="w-4 h-4 text-neutral-400" />}
              </button>

              {!isCollapsed && (
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {table.entries.map(entry => (
                        <tr
                          key={entry.id}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-black text-neutral-900 dark:text-white whitespace-nowrap">
                            {entry.level_code}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-neutral-500 whitespace-nowrap">
                            {entry.level_percent}
                          </td>
                          {CLASS_KEYS.map(code => (
                            <td
                              key={code}
                              className="py-2.5 px-3 text-right font-mono font-medium text-neutral-800 dark:text-neutral-200 whitespace-nowrap"
                            >
                              {formatBRL(getEntryClassValue(entry, code))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
