import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  BookOpen, 
  Calendar, 
  Building2, 
  Landmark, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Share2, 
  Search, 
  ChevronRight,
  ChevronDown,
  Sparkles, 
  Link2, 
  FileCheck2, 
  Layers, 
  ArrowRight, 
  FileSpreadsheet, 
  CheckCircle2, 
  Newspaper, 
  Layout,
  Table as TableIcon,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Institution, MunicipalLaw } from '../../../types';
import { showToast } from '../../../components/ui/Toast';
import { 
  parseLawDocument, 
  paginateLawDocument, 
  ParsedLawStructure, 
  ParsedLawPage,
  BudgetTableBlock,
  DataTableBlock,
  budgetTableToTSV,
  budgetTableToText,
  dataTableToTSV,
  dataTableToText,
  allBudgetTablesToTSV
} from '../utils/lawFormatter';

interface LawReaderModalProps {
  law: MunicipalLaw;
  allLaws?: MunicipalLaw[];
  institution?: Institution;
  darkMode?: boolean;
  isMourning?: boolean;
  defaultDisplayStyle?: 'diario' | 'lexml' | 'pdf';
  onClose: () => void;
  onEdit?: (law: MunicipalLaw) => void;
  onDelete?: (law: MunicipalLaw) => void;
  onSelectRelatedLaw?: (law: MunicipalLaw) => void;
}

interface ParsedSection {
  id: string;
  type: 'titulo' | 'capitulo' | 'artigo' | 'preambulo' | 'texto' | 'tabela';
  label: string;
  rawText: string;
  articleNumber?: string;
}

export const LawReaderModal = ({
  law,
  allLaws = [],
  institution,
  darkMode,
  isMourning = false,
  defaultDisplayStyle = 'diario',
  onClose,
  onEdit,
  onDelete,
  onSelectRelatedLaw
}: LawReaderModalProps) => {
  const hasCompiledText = Boolean(law.compiled_text && law.compiled_text.trim().length > 0);
  const hasBodyText = Boolean(
    (law.compiled_text && law.compiled_text.trim().length > 0) ||
      (law.full_text && law.full_text.trim().length > 0)
  );

  const resolveInitialStyle = (): 'diario' | 'lexml' | 'pdf' => {
    if (!hasBodyText && law.file_url) return 'pdf';
    if (defaultDisplayStyle === 'pdf' && !law.file_url) return 'lexml';
    return defaultDisplayStyle;
  };

  // Modo de redação: compilado vs original
  const [viewMode, setViewMode] = useState<'compiled' | 'original'>(
    hasCompiledText && law.is_compiled ? 'compiled' : 'original'
  );

  // Estilo de visualização: 'diario' (Folhas A4 Paginação Real) vs 'lexml' (Leitor Digital Interativo) vs 'pdf' (PDF Original)
  const [displayStyle, setDisplayStyle] = useState<'diario' | 'lexml' | 'pdf'>(resolveInitialStyle);

  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);
  const [copiedFullLaw, setCopiedFullLaw] = useState(false);
  const [copiedTableIndex, setCopiedTableIndex] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [tocSearch, setTocSearch] = useState('');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [fontScale, setFontScale] = useState<0 | 1 | 2>(1);

  const institutionName = institution?.name || 'Prefeitura Municipal';

  // Sincroniza modo inicial quando o usuário navega para outra norma relacionada
  useEffect(() => {
    setViewMode(hasCompiledText && law.is_compiled ? 'compiled' : 'original');
    setDisplayStyle(!hasBodyText && law.file_url ? 'pdf' : defaultDisplayStyle === 'pdf' && !law.file_url ? 'lexml' : defaultDisplayStyle);
    setActiveArticleId(null);
    setTocSearch('');
    setMobileTocOpen(false);
    setCopiedFullLaw(false);
  }, [law.id, hasCompiledText, hasBodyText, law.is_compiled, law.file_url, defaultDisplayStyle]);

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const formatDatePtBr = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    const safe = dateStr.length >= 10 ? `${dateStr.slice(0, 10)}T12:00:00` : dateStr;
    const d = new Date(safe);
    return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
  };

  // Texto ativo conforme o modo selecionado
  const activeText = useMemo(() => {
    if (viewMode === 'compiled' && law.compiled_text) {
      return law.compiled_text;
    }
    return law.full_text || law.ementa;
  }, [viewMode, law]);

  // Parser estruturado técnico-legislativo (padrão LC 95 e AMM-MT)
  const parsedDoc: ParsedLawStructure = useMemo(() => {
    return parseLawDocument(activeText, law.ementa, {
      type: law.type,
      number: law.number,
      publication_date: law.publication_date,
      author: law.author,
      institution_name: institution?.name
    });
  }, [activeText, law, institution?.name]);

  // Paginação Real em Folhas A4 do Diário Oficial
  const pages: ParsedLawPage[] = useMemo(() => {
    return paginateLawDocument(parsedDoc);
  }, [parsedDoc]);

  // Contagem de tabelas orçamentárias e demonstrativas na lei
  const budgetTablesCount = useMemo(() => {
    return parsedDoc.blocks.filter(b => b.type === 'budget_table' || b.type === 'data_table').length;
  }, [parsedDoc]);

  // Parser dos artigos para o sumário lateral do Leitor LexML
  const sections = useMemo<ParsedSection[]>(() => {
    if (!activeText) return [];
    const lines = activeText.split('\n');
    const parsed: ParsedSection[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (/^TÍTULO\s+/i.test(trimmed)) {
        parsed.push({
          id: `sec-titulo-${index}`,
          type: 'titulo',
          label: trimmed,
          rawText: trimmed
        });
      } else if (/^CAPÍTULO\s+/i.test(trimmed) || /^LIVRO\s+/i.test(trimmed)) {
        parsed.push({
          id: `sec-capitulo-${index}`,
          type: 'capitulo',
          label: trimmed,
          rawText: trimmed
        });
      } else if (/^(Art\.|Artigo)\s*([0-9ºººªa-zA-Z.-]+)/i.test(trimmed)) {
        const match = trimmed.match(/^(Art\.|Artigo)\s*([0-9ºººªa-zA-Z.-]+)/i);
        const artNum = match ? match[2] : '';
        parsed.push({
          id: `sec-art-${index}`,
          type: 'artigo',
          label: `Art. ${artNum}`,
          rawText: trimmed,
          articleNumber: artNum
        });
      } else if (/^Órgão:/i.test(trimmed)) {
        parsed.push({
          id: `sec-tab-${index}`,
          type: 'tabela',
          label: trimmed.slice(0, 32),
          rawText: trimmed
        });
      }
    });

    return parsed;
  }, [activeText]);

  // Seções filtradas pela busca rápida do sumário
  const filteredSections = useMemo(() => {
    if (!tocSearch.trim()) return sections;
    const q = tocSearch.toLowerCase().trim();
    return sections.filter(s => s.label.toLowerCase().includes(q) || s.rawText.toLowerCase().includes(q));
  }, [sections, tocSearch]);

  // Identificação de Decretos Regulamentadores vinculados a esta Lei
  const relatedRegulations = useMemo(() => {
    return allLaws.filter(l => 
      l.id !== law.id && 
      (l.parent_law_id === law.id || (l.parent_law_number && l.parent_law_number.includes(law.number)))
    );
  }, [allLaws, law]);

  // Rolar até o artigo clicado no sumário
  const scrollToSection = (id: string) => {
    setActiveArticleId(id);
    setMobileTocOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Copiar artigo formatado para citação oficial
  const handleCopyArticle = (articleText: string, articleLabel: string) => {
    const citation = `Conforme o ${articleLabel} da ${law.type} nº ${law.number} (${law.title}):\n"${articleText.trim()}"`;
    navigator.clipboard?.writeText(citation);
    setCopiedArticleId(articleLabel);
    showToast(`${articleLabel} copiado com citação oficial!`, 'success');
    setTimeout(() => setCopiedArticleId(null), 2500);
  };

  // Copiar texto completo da norma para área de transferência
  const handleCopyFullLaw = () => {
    const fullCopy = `${institutionName.toUpperCase()}\n${law.type.toUpperCase()} Nº ${law.number} — ${law.title}\nData: ${formatDatePtBr(law.publication_date)}\n\nEMENTA: ${law.ementa}\n\n${activeText || ''}`.trim();
    navigator.clipboard?.writeText(fullCopy);
    setCopiedFullLaw(true);
    showToast('Texto completo da norma copiado!', 'success');
    setTimeout(() => setCopiedFullLaw(false), 2500);
  };

  // Copiar Tabela Individual (Texto ou Excel/TSV)
  const handleCopyTable = (block: BudgetTableBlock | DataTableBlock, index: number, asTSV = false) => {
    const textToCopy =
      block.type === 'data_table'
        ? asTSV
          ? dataTableToTSV(block)
          : dataTableToText(block)
        : asTSV
        ? budgetTableToTSV(block)
        : budgetTableToText(block);
    navigator.clipboard?.writeText(textToCopy);
    setCopiedTableIndex(index);
    showToast(
      asTSV ? 'Tabela copiada em formato Excel (TSV)! Cole no Excel com Ctrl+V.' : 'Tabela copiada com sucesso!',
      'success'
    );
    setTimeout(() => setCopiedTableIndex(null), 2500);
  };

  // Copiar Todas as Tabelas Orçamentárias da Lei para Excel
  const handleCopyAllTablesExcel = () => {
    const allTSV = allBudgetTablesToTSV(law.title, parsedDoc.blocks);
    navigator.clipboard?.writeText(allTSV);
    showToast('Todas as tabelas foram copiadas para a Área de Transferência em formato Excel (TSV)!', 'success');
  };

  // Impressão Direta do Diário Oficial via browser
  const handlePrintBrowser = () => {
    window.print();
  };

  // Geração de PDF Oficial da Ficha Normativa
  const handlePrintPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const toWinAnsiSafe = (value: string) =>
        (value || '')
          .replace(/[—–]/g, '-')
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'")
          .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { height } = page.getSize();
      
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Faixa Superior Institucional
      page.drawRectangle({
        x: 40,
        y: height - 85,
        width: 515,
        height: 50,
        color: rgb(0.0, 0.29, 0.50) // Azul institucional #004a80
      });

      page.drawText(toWinAnsiSafe(`${institutionName.toUpperCase()} - PORTAL DA LEGISLAÇÃO`), {
        x: 55,
        y: height - 55,
        size: 8.5,
        font: helveticaBold,
        color: rgb(0.85, 0.92, 1)
      });

      page.drawText(toWinAnsiSafe(`${law.type.toUpperCase()} Nº ${law.number}`), {
        x: 55,
        y: height - 72,
        size: 13,
        font: helveticaBold,
        color: rgb(1, 1, 1)
      });

      let currentY = height - 110;
      const drawField = (label: string, value: string) => {
        page.drawText(toWinAnsiSafe(`${label}:`), {
          x: 40,
          y: currentY,
          size: 9,
          font: helveticaBold,
          color: rgb(0.3, 0.3, 0.3)
        });
        page.drawText(toWinAnsiSafe(value || 'N/A'), {
          x: 160,
          y: currentY,
          size: 9,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1)
        });
        currentY -= 15;
      };

      drawField('Município / Entidade', institutionName.toUpperCase());
      drawField('Data de Publicação', formatDatePtBr(law.publication_date));
      drawField('Poder de Origem', law.origin_power === 'legislativo' ? 'Poder Legislativo (Câmara Municipal)' : 'Poder Executivo (Prefeitura)');
      if (law.materia_numero) drawField('Matéria de Origem', law.materia_numero);

      currentY -= 8;
      // Caixa da Ementa
      page.drawRectangle({
        x: 40,
        y: currentY - 55,
        width: 515,
        height: 55,
        color: rgb(0.96, 0.97, 0.99)
      });

      page.drawText('EMENTA OFICIAL:', {
        x: 50,
        y: currentY - 14,
        size: 8.5,
        font: helveticaBold,
        color: rgb(0.0, 0.29, 0.50)
      });

      const words = toWinAnsiSafe(law.ementa || '').split(' ');
      let line = '';
      let lineY = currentY - 26;
      for (const word of words) {
        if ((line + word).length > 85) {
          page.drawText(line, { x: 50, y: lineY, size: 8, font: helvetica });
          line = word + ' ';
          lineY -= 11;
        } else {
          line += word + ' ';
        }
      }
      if (line) page.drawText(line, { x: 50, y: lineY, size: 8, font: helvetica });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const slugInst = (institution?.subdomain || 'municipio').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Norma_${law.number.replace(/[^a-zA-Z0-9]/g, '_')}_${slugInst}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('PDF oficial exportado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar PDF da ficha normativa.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Suporte a tachado ~~texto revogado~~ e anotações *(Redação dada pela Lei...)*
  const renderStrikethroughAndNotes = (content: string) => {
    const parts = content.split(/(~~.*?~~|\*\(.*?\)\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('~~') && part.endsWith('~~')) {
        const inner = part.slice(2, -2);
        return (
          <span 
            key={pIdx} 
            className="line-through text-rose-500/80 dark:text-rose-400/80 bg-rose-50/60 dark:bg-rose-950/30 px-1 py-0.5 rounded text-xs font-sans select-all mx-0.5"
            title="Redação revogada / alterada"
          >
            {inner}
          </span>
        );
      }
      if (part.startsWith('*(') && part.endsWith(')*')) {
        const inner = part.slice(2, -2);
        return (
          <span 
            key={pIdx} 
            className="text-[11px] font-sans font-bold italic text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 mx-1"
          >
            {inner}
          </span>
        );
      }
      return <span key={pIdx}>{part}</span>;
    });
  };

  // Renderiza tabela orçamentária com acabamento formal e ações de cópia
  const renderBudgetTableBlock = (block: BudgetTableBlock, index: number, isGazetteMode = false) => {
    const isCopied = copiedTableIndex === index;

    return (
      <div key={`budget-${index}`} className={`my-4 group ${isGazetteMode ? 'text-black' : ''}`}>
        {/* Barra de Título da Tabela & Botões de Cópia */}
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <div className={`text-xs font-bold font-sans ${isGazetteMode ? 'text-neutral-900' : 'text-neutral-800 dark:text-neutral-200'}`}>
            {block.entity || (block.isContinuation ? 'Dotação Orçamentária (Continuação)' : 'Dotação Orçamentária')}
          </div>

          <div className="opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 no-print">
            <button
              type="button"
              onClick={() => handleCopyTable(block, index, false)}
              className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700"
              title="Copiar tabela formatada para texto / parecer"
            >
              {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyTable(block, index, true)}
              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-800"
              title="Copiar dados para colar no Excel ou Google Sheets (colunas separadas)"
            >
              <FileSpreadsheet size={11} className="text-emerald-600 dark:text-emerald-400" />
              <span>Excel (TSV)</span>
            </button>
          </div>
        </div>

        {/* Tabela Formatada com Seleção Desbloqueada */}
        <div className={`border rounded-lg overflow-hidden text-xs font-sans select-text cursor-text ${
          isGazetteMode 
            ? 'border-neutral-300 bg-white shadow-xs' 
            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-xs'
        }`}>
          <table className="w-full border-collapse select-text">
            <tbody>
              {block.rows.map((row, rIdx) => (
                <tr 
                  key={rIdx} 
                  className={`border-b last:border-b-0 ${
                    isGazetteMode 
                      ? 'border-neutral-300 hover:bg-neutral-50/70' 
                      : 'border-neutral-100 dark:border-neutral-800/80 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <td className={`w-[26%] sm:w-[22%] font-bold p-2.5 border-r align-top select-text ${
                    isGazetteMode 
                      ? 'bg-neutral-50/90 border-neutral-300 text-neutral-900' 
                      : 'bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-100 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
                  }`}>
                    {row.label}
                  </td>
                  <td className="p-2.5 text-neutral-900 dark:text-neutral-100 align-top select-text">
                    {row.isNaturezaDespesa && row.naturezaValor ? (
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 select-text">
                          {row.naturezaCodeDesc}
                        </span>
                        <span className="hidden sm:inline-block flex-1 mx-2 border-b border-dotted border-neutral-400 self-center"></span>
                        <span className="font-mono font-black text-emerald-800 dark:text-emerald-400 text-right shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 select-text">
                          {row.naturezaValor}
                        </span>
                      </div>
                    ) : (
                      <span className={`select-text ${row.isOrgao ? 'font-bold text-neutral-900 dark:text-white' : 'font-medium'}`}>
                        {row.value}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Renderiza tabela em grade/colunas (cargos, vencimentos, anexos, quadros gerais)
  const renderDataTableBlock = (block: DataTableBlock, index: number, isGazetteMode = false) => {
    const isCopied = copiedTableIndex === index;

    return (
      <div key={`datatable-${index}`} className={`my-4 group ${isGazetteMode ? 'text-black' : ''}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <div className={`text-xs font-bold font-sans ${isGazetteMode ? 'text-neutral-900' : 'text-neutral-800 dark:text-neutral-200'}`}>
            {block.title || 'Tabela / Quadro Demonstrativo'}
          </div>

          <div className="opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 no-print">
            <button
              type="button"
              onClick={() => handleCopyTable(block, index, false)}
              className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700"
              title="Copiar tabela formatada para texto / parecer"
            >
              {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyTable(block, index, true)}
              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-800"
              title="Copiar dados para colar no Excel ou Google Sheets (colunas separadas)"
            >
              <FileSpreadsheet size={11} className="text-emerald-600 dark:text-emerald-400" />
              <span>Excel (TSV)</span>
            </button>
          </div>
        </div>

        <div className={`border rounded-lg overflow-x-auto text-xs font-sans select-text cursor-text ${
          isGazetteMode 
            ? 'border-neutral-300 bg-white shadow-xs' 
            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-xs'
        }`}>
          <table className="w-full border-collapse select-text">
            {block.headers.length > 0 && (
              <thead>
                <tr className={`border-b ${
                  isGazetteMode
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
                    : 'bg-neutral-100/80 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
                }`}>
                  {block.headers.map((header, hIdx) => (
                    <th
                      key={hIdx}
                      className="font-bold text-left p-2.5 border-r last:border-r-0 border-neutral-300 dark:border-neutral-700 select-text"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, rIdx) => (
                <tr 
                  key={rIdx} 
                  className={`border-b last:border-b-0 ${
                    isGazetteMode 
                      ? 'border-neutral-300 even:bg-neutral-50/70' 
                      : 'border-neutral-100 dark:border-neutral-800/80 even:bg-neutral-50/40 dark:even:bg-neutral-800/30'
                  }`}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`p-2.5 border-r last:border-r-0 align-top select-text ${
                        isGazetteMode
                          ? 'border-neutral-300 text-neutral-900'
                          : 'border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
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
  };

  return createPortal(
    <div className={`${darkMode ? 'dark' : ''} ${isMourning ? 'grayscale' : ''}`}>
      {/* Estilos específicos para impressão fiel ao Diário Oficial e Modelo Próprio com Gestão 360 */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 15mm 15mm 15mm;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .diario-page-sheet, .diario-page-sheet *,
          .modelo-proprio-print, .modelo-proprio-print * {
            visibility: visible !important;
          }
          #print-diario-container, #print-modelo-proprio-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .diario-page-sheet {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto !important;
            padding: 12mm 15mm 15mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            min-height: 270mm !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .modelo-proprio-print {
            display: block !important;
            margin: 0 auto !important;
            padding: 10mm 15mm 15mm 15mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-neutral-950/85 backdrop-blur-md no-print"
      >
        <motion.div 
          role="dialog"
          aria-modal="true"
          aria-label={`${law.type} ${law.number}`}
          initial={{ scale: 0.96, y: 15 }} 
          animate={{ scale: 1, y: 0 }} 
          exit={{ scale: 0.96, y: 15 }}
          className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 w-full max-w-7xl h-[94vh] max-h-[96vh] rounded-2xl sm:rounded-[28px] shadow-2xl flex flex-col border border-neutral-200 dark:border-neutral-800 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* =========================================================================
              1. TOPO INTEGRADO DO LEITOR (CABEÇALHO NORMATIVO & CONTROLES RESPONSIVOS)
             ========================================================================= */}
          <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/95 dark:bg-neutral-900/95 shrink-0">
            {/* LINHA 1: IDENTIFICAÇÃO DA NORMA E BOTÃO FECHAR */}
            <div className="px-3 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between gap-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {institution?.logo_url ? (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-xs">
                    <img
                      src={institution.logo_url}
                      alt={institution.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    law.origin_power === 'legislativo'
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {law.origin_power === 'legislativo' ? <Landmark size={18} /> : <Building2 size={18} />}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shrink-0">
                      {law.type}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white font-mono shrink-0">
                      Nº {law.number}
                    </span>

                    {/* Badge de Vigência */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      law.status === 'Em Vigor'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : law.status === 'Regulamentada'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    }`}>
                      {law.status}
                    </span>

                    <span className="hidden md:inline-flex text-[10px] font-bold text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
                      {law.origin_power === 'legislativo' ? 'Poder Legislativo' : 'Poder Executivo'}
                    </span>

                    <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-400">
                      <Calendar size={11} />
                      {formatDatePtBr(law.publication_date)}
                    </span>
                  </div>

                  <h2 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate mt-0.5" title={law.title}>
                    {law.title}
                  </h2>
                </div>
              </div>

              {/* Botão Fechar Fixo no Topo Direito (Sempre Visível) */}
              <button 
                type="button" 
                onClick={onClose} 
                aria-label="Fechar leitor"
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
                title="Fechar Leitor (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* LINHA 2: BARRA DE FERRAMENTAS RESPONSIVA (ABAS + AÇÕES) */}
            <div className="px-3 py-2 sm:px-6 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap">
              {/* Seletor de Modo de Visualização */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-xl text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setDisplayStyle('lexml')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      displayStyle === 'lexml'
                        ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                    title="Leitor digital interativo com índice e artigos"
                  >
                    <Layout size={13} />
                    <span>Leitura Interativa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayStyle('diario')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      displayStyle === 'diario'
                        ? 'bg-white dark:bg-neutral-700 text-[#004a80] dark:text-blue-400 shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                    title="Folhas A4 paginadas no padrão Documento Oficial"
                  >
                    <Newspaper size={13} />
                    <span>Documento Oficial (A4)</span>
                  </button>
                  {law.file_url && (
                    <button
                      type="button"
                      onClick={() => setDisplayStyle('pdf')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        displayStyle === 'pdf'
                          ? 'bg-white dark:bg-neutral-700 text-rose-600 dark:text-rose-400 shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                      title="Visualizar o PDF oficial digitalizado original anexado"
                    >
                      <FileText size={13} />
                      <span>PDF Original</span>
                    </button>
                  )}
                </div>

                {hasCompiledText && (
                  <div className="flex items-center bg-neutral-200/80 dark:bg-neutral-800 p-0.5 rounded-xl text-[11px] font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('compiled')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        viewMode === 'compiled'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <Sparkles size={11} />
                      <span>Compilada</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('original')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        viewMode === 'original'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      Original
                    </button>
                  </div>
                )}
              </div>

              {/* Botões de Ação na Direita */}
              <div className="flex items-center gap-1.5 shrink-0">
                {displayStyle === 'lexml' && (
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-0.5">
                    <button
                      type="button"
                      onClick={() => setFontScale((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : 0))}
                      disabled={fontScale === 0}
                      className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-40 cursor-pointer"
                      title="Diminuir tamanho da fonte"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="px-1.5 text-[10px] font-black text-neutral-500 dark:text-neutral-400">
                      {fontScale === 0 ? 'P' : fontScale === 1 ? 'M' : 'G'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFontScale((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : 2))}
                      disabled={fontScale === 2}
                      className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-40 cursor-pointer"
                      title="Aumentar tamanho da fonte"
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCopyFullLaw}
                  className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-300 dark:border-neutral-700"
                  title="Copiar texto completo da norma"
                >
                  {copiedFullLaw ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span className="hidden md:inline">{copiedFullLaw ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                {budgetTablesCount > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyAllTablesExcel}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-300 dark:border-emerald-800"
                    title="Copiar todas as tabelas para Excel"
                  >
                    <FileSpreadsheet size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden lg:inline">Copiar Tabelas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrintBrowser}
                  className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-300 dark:border-neutral-700"
                  title="Imprimir documento completo"
                >
                  <Printer size={13} />
                  <span className="hidden sm:inline">
                    {displayStyle === 'diario' ? 'Imprimir A4' : 'Imprimir'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={handlePrintPdf}
                  className="px-2.5 py-1.5 bg-[#004a80] hover:bg-[#003964] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Baixar Ficha Normativa em PDF"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Ficha PDF</span>
                </button>

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(law);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Editar Atributos e Conteúdo da Norma"
                  >
                    <span>Editar Norma</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDelete(law);
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Excluir esta norma do acervo"
                  >
                    <span>Excluir</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              2. ÁREA DE LEITURA (ALTERNÂNCIA ENTRE FOLHAS A4 E LEITOR LEXML)
             ========================================================================= */}
          {displayStyle === 'diario' ? (
            /* =========================================================================
               VISUALIZAÇÃO 1: FOLHAS A4 PAGINADAS REAIS (PADRÃO DOCUMENTO OFICIAL)
               ========================================================================= */
            <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-neutral-200/70 dark:bg-neutral-950 custom-scrollbar flex flex-col items-center">
              
              {/* Barra Informativa de Paginação */}
              <div className="mb-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-2 no-print bg-white/80 dark:bg-neutral-900/80 px-4 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-800 shadow-xs">
                <Newspaper size={14} className="text-[#004a80] dark:text-blue-400" />
                <span>Edição Oficial Paginada • {pages.length} {pages.length === 1 ? 'Página' : 'Páginas A4'}</span>
              </div>

              {/* Container de Impressão e Exibição Multi-Páginas */}
              <div id="print-diario-container" className="w-full flex flex-col items-center">
                {pages.map((page) => (
                  <div 
                    key={`page-${page.pageNumber}`}
                    className="diario-page-sheet w-full max-w-[860px] bg-white text-neutral-900 shadow-2xl rounded-sm border border-neutral-300 p-8 sm:p-14 min-h-[1100px] font-serif flex flex-col justify-between mb-8 relative transition-all"
                  >
                    {/* Topo da Folha: Cabeçalho Oficial do Diário dos Municípios */}
                    <div className="flex items-center justify-between pb-3 border-b-2 border-[#004a80] text-[#004a80] font-sans text-xs">
                      <span className="font-black text-sm tracking-wide">
                        {parsedDoc.diarioHeader.diario}
                      </span>
                      <span className="font-semibold text-neutral-700 text-center">
                        {parsedDoc.diarioHeader.edicaoData}
                      </span>
                      <span className="font-black">
                        {parsedDoc.diarioHeader.estado}
                      </span>
                    </div>

                    {/* Corpo Central da Folha */}
                    <div className="flex-1 my-4 space-y-3">
                      {/* Epígrafe na Primeira Página */}
                      {page.includeEpigraph && (
                        <div className="text-center my-6 space-y-1">
                          {institution?.logo_url && (
                            <img
                              src={institution.logo_url}
                              alt={institutionName}
                              className="h-12 w-auto mx-auto mb-2 object-contain"
                            />
                          )}
                          <h2 className="text-xl sm:text-2xl font-black tracking-wide uppercase text-neutral-900 font-serif">
                            {parsedDoc.epigrafe.tipoNumero}
                          </h2>
                          <p className="text-xs sm:text-sm font-semibold text-neutral-700 font-serif">
                            {parsedDoc.epigrafe.data}
                          </p>
                          <p className="text-xs font-black text-[#004a80] tracking-wider uppercase font-sans pt-0.5">
                            {parsedDoc.epigrafe.entidade || institutionName.toUpperCase()}
                          </p>
                        </div>
                      )}

                      {/* Ementa Oficial na Primeira Página (Alinhada à Direita com ~58% de Largura) */}
                      {page.includeEmenta && (
                        <div className="flex justify-end my-6">
                          <div className="w-full sm:w-[58%] text-justify text-xs sm:text-[13px] font-serif italic text-neutral-900 leading-relaxed pl-4 border-l border-neutral-300">
                            "{parsedDoc.ementa}"
                          </div>
                        </div>
                      )}

                      {page.isFirstPage && !hasBodyText && (law.file_url || law.external_link) && (
                        <div className="my-6 p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center font-sans space-y-2 no-print">
                          <p className="text-xs font-semibold text-neutral-700">
                            O conteúdo integral desta norma está disponível no documento oficial digitalizado em anexo.
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            {law.file_url && (
                              <button
                                type="button"
                                onClick={() => setDisplayStyle('pdf')}
                                className="px-3.5 py-1.5 rounded-lg bg-[#004a80] text-white text-xs font-bold cursor-pointer"
                              >
                                Abrir PDF Original
                              </button>
                            )}
                            {law.external_link && (
                              <a
                                href={law.external_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-1.5 rounded-lg bg-neutral-800 text-white text-xs font-bold"
                              >
                                Abrir Link Oficial
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Preâmbulo na Primeira Página */}
                      {page.includePreambulo && parsedDoc.preambulo && (
                        <p className="my-5 text-xs sm:text-[13px] font-serif leading-relaxed text-justify text-neutral-900 indent-8">
                          {parsedDoc.preambulo}
                        </p>
                      )}

                      {/* Blocos de Conteúdo e Tabelas pertencentes a esta página */}
                      {page.blocks.map((block, bIdx) => {
                        if (block.type === 'budget_table') {
                          return renderBudgetTableBlock(block as BudgetTableBlock, bIdx, true);
                        }

                        if (block.type === 'data_table') {
                          return renderDataTableBlock(block as DataTableBlock, bIdx, true);
                        }

                        if (block.type === 'article') {
                          return (
                            <p key={bIdx} className="text-xs sm:text-[13px] font-serif leading-relaxed text-justify text-neutral-900 indent-8 my-2 select-text">
                              {renderStrikethroughAndNotes(block.rawText)}
                            </p>
                          );
                        }

                        if (block.type === 'heading_titulo') {
                          return (
                            <div key={bIdx} className="pt-5 pb-2 border-b border-neutral-300 text-center">
                              <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">
                                {block.rawText}
                              </h3>
                            </div>
                          );
                        }

                        if (block.type === 'heading_capitulo') {
                          return (
                            <div key={bIdx} className="pt-3 pb-1 text-center">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                                {block.rawText}
                              </h4>
                            </div>
                          );
                        }

                        return (
                          <p key={bIdx} className="text-xs sm:text-[13px] font-serif leading-relaxed text-justify text-neutral-900 indent-8 my-1.5 select-text">
                            {renderStrikethroughAndNotes(block.rawText)}
                          </p>
                        );
                      })}

                      {/* Fecho e Chancela de Assinatura na Página Final */}
                      {page.includeFechoAssinatura && (
                        <div className="mt-12 pt-6 text-xs sm:text-[13px] font-serif">
                          {parsedDoc.fecho && (
                            <p className="text-right text-neutral-800 font-serif mb-10 select-text">
                              {parsedDoc.fecho}
                            </p>
                          )}

                          <div className="text-center mt-12 space-y-1">
                            <div className="w-64 mx-auto border-t border-neutral-400 mb-2"></div>
                            <p className="font-bold text-neutral-900 uppercase tracking-wide font-sans text-xs sm:text-sm select-text">
                              {parsedDoc.assinatura.nome}
                            </p>
                            <p className="text-neutral-600 font-sans text-[11px] select-text">
                              {parsedDoc.assinatura.cargo}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rodapé Oficial da Página A4 com Propaganda e Autenticidade Gestão 360 */}
                    <div className="mt-auto pt-3 border-t border-neutral-300 font-sans space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span className="text-[10px] text-neutral-400">
                          {page.totalPages > 1 ? `Página ${page.pageNumber} de ${page.totalPages}` : ''}
                        </span>
                        <span className="font-bold text-neutral-700 font-mono">
                          {page.pageNumber}
                        </span>
                        <span className="font-mono text-neutral-600">{institutionName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-neutral-500 pt-1 border-t border-dotted border-neutral-200 gap-2">
                        <span className="font-bold tracking-wider text-neutral-700 flex items-center gap-1">
                          Cópia informativa para consulta • Prevalece o PDF oficial assinado
                        </span>
                        <span className="font-mono text-neutral-500 shrink-0">
                          Portal da Legislação • Gestão 360
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : displayStyle === 'pdf' ? (
            /* =========================================================================
               VISUALIZAÇÃO 3: PDF ORIGINAL DIGITALIZADO (INTEGRAÇÃO COMPLETA)
               ========================================================================= */
            <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
              {/* Barra Superior do PDF */}
              <div className="bg-neutral-800 text-neutral-200 px-4 py-2.5 flex items-center justify-between text-xs border-b border-neutral-700 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <FileText size={14} />
                  </div>
                  <span className="font-bold text-white">Documento Digitalizado Original</span>
                  <span className="hidden sm:inline text-neutral-400">• PDF Oficial Anexado ao Acervo</span>
                </div>
                <div className="flex items-center gap-2">
                  {law.file_url && (
                    <>
                      <a
                        href={law.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
                        title="Abrir PDF em nova aba do navegador"
                      >
                        <ExternalLink size={13} />
                        <span>Abrir em Nova Aba</span>
                      </a>
                      <a
                        href={law.file_url}
                        download={`Lei_${law.number.replace(/[^a-zA-Z0-9]/g, '_')}_Original.pdf`}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5 font-bold cursor-pointer shadow-sm"
                        title="Baixar arquivo PDF original"
                      >
                        <Download size={13} />
                        <span>Baixar PDF</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Área do Iframe ou Fallback */}
              <div className="flex-1 w-full h-full bg-neutral-950 flex items-center justify-center">
                {law.file_url ? (
                  <iframe
                    src={law.file_url}
                    title={`PDF Oficial - ${law.title}`}
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center p-8 text-neutral-400 max-w-md">
                    <FileText size={48} className="mx-auto mb-3 opacity-30 text-rose-400" />
                    <h4 className="font-bold text-white text-base mb-1">Nenhum PDF Original Anexado</h4>
                    <p className="text-xs text-neutral-400 mb-4">
                      Esta norma foi cadastrada via digitação direta. Você pode visualizar no formato Diário Oficial (A4) ou Leitor LexML.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDisplayStyle('diario')}
                      className="px-4 py-2 bg-[#004a80] text-white rounded-xl text-xs font-bold hover:bg-[#003964] cursor-pointer"
                    >
                      Ver no Diário Oficial
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =========================================================================
               VISUALIZAÇÃO 2: LEITOR DIGITAL INTERATIVO (PADRÃO LEXML 3 COLUNAS)
               ========================================================================= */
            <div className="flex-1 flex overflow-hidden">
              
              {/* PAINEL ESQUERDO: SUMÁRIO NAVEGÁVEL POR ARTIGOS */}
              <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-3 hidden lg:flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                  <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <BookOpen size={13} className="text-emerald-500" />
                    Índice da Norma
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400">
                    {sections.length} itens
                  </span>
                </div>

                {/* Busca Rápida no Sumário */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" size={13} />
                  <input
                    type="text"
                    placeholder="Buscar artigo ou tabela..."
                    value={tocSearch}
                    onChange={e => setTocSearch(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg pl-8 pr-2 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Lista dos Artigos */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredSections.length === 0 ? (
                    <p className="text-[11px] text-neutral-400 text-center py-4">Nenhum artigo encontrado</p>
                  ) : (
                    filteredSections.map(sec => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer truncate ${
                          sec.type === 'titulo'
                            ? 'font-black text-neutral-900 dark:text-white bg-neutral-200/50 dark:bg-neutral-800/60 mt-2'
                            : sec.type === 'capitulo'
                            ? 'font-bold text-neutral-700 dark:text-neutral-300 pl-3 mt-1'
                            : sec.type === 'tabela'
                            ? 'font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
                            : activeArticleId === sec.id
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                        }`}
                      >
                        {sec.label}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* PAINEL CENTRAL: TEXTO EDITORIAL LEXML COM CARDS DE TABELA */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 custom-scrollbar bg-white dark:bg-neutral-900">
                <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">

                  {/* Navegação Mobile por Artigos / Capítulos */}
                  {sections.length > 0 && (
                    <div className="lg:hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMobileTocOpen((v) => !v)}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-200 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <BookOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Navegar pelos Artigos & Capítulos ({sections.length})</span>
                        </span>
                        <ChevronDown
                          size={15}
                          className={`transition-transform ${mobileTocOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {mobileTocOpen && (
                        <div className="px-3 pb-3 pt-1 max-h-52 overflow-y-auto flex flex-wrap gap-1.5 border-t border-neutral-200/70 dark:border-neutral-800">
                          {sections.map((sec) => (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => scrollToSection(sec.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                activeArticleId === sec.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              {sec.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Ementa em Destaque */}
                  <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 block mb-1.5">
                      Ementa Oficial
                    </span>
                    <p className="text-sm sm:text-[15px] font-serif italic text-neutral-800 dark:text-neutral-200 leading-relaxed select-text">
                      "{parsedDoc.ementa}"
                    </p>
                  </div>

                  {/* Aviso quando não houver texto digitado/extraído e existir PDF ou link */}
                  {!hasBodyText && (law.file_url || law.external_link) && (
                    <div className="p-5 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
                          Texto Integral em Anexo Oficial
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Esta norma foi publicada com documento oficial digitalizado anexo para consulta e download.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {law.file_url && (
                          <button
                            type="button"
                            onClick={() => setDisplayStyle('pdf')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-xs"
                          >
                            <FileText size={14} />
                            <span>Abrir PDF Integrado</span>
                          </button>
                        )}
                        {law.external_link && (
                          <a
                            href={law.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold"
                          >
                            <ExternalLink size={14} />
                            <span>Abrir Link Oficial</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informação do Modo Compilado */}
                  {viewMode === 'compiled' && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-600" />
                        <span>Exibindo versão compilada com histórico de alterações legislativas vigentes.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewMode('original')}
                        className="font-bold underline cursor-pointer"
                      >
                        Ver original
                      </button>
                    </div>
                  )}

                  {/* Preâmbulo no Leitor Digital */}
                  {parsedDoc.preambulo && (
                    <p
                      className={`font-serif italic text-neutral-700 dark:text-neutral-300 leading-relaxed border-l-2 border-neutral-300 dark:border-neutral-700 pl-4 my-3 select-text ${
                        fontScale === 0 ? 'text-[13px]' : fontScale === 1 ? 'text-sm sm:text-[15px]' : 'text-base sm:text-[17px]'
                      }`}
                    >
                      {parsedDoc.preambulo}
                    </p>
                  )}

                  {/* Corpo de Artigos e Blocos de Tabelas */}
                  {hasBodyText && (
                  <div className="space-y-4 text-neutral-900 dark:text-neutral-100 select-text">
                    {parsedDoc.blocks.map((block, idx) => {
                      const bodySizeClass =
                        fontScale === 0
                          ? 'text-[13px] leading-relaxed'
                          : fontScale === 1
                          ? 'text-[15px] leading-7'
                          : 'text-[17px] leading-8';

                      if (block.type === 'budget_table') {
                        return renderBudgetTableBlock(block as BudgetTableBlock, idx, false);
                      }

                      if (block.type === 'data_table') {
                        return renderDataTableBlock(block as DataTableBlock, idx, false);
                      }

                      if (block.type === 'article') {
                        return (
                          <div 
                            key={idx} 
                            id={block.id}
                            className="group relative my-3 p-3.5 rounded-2xl transition-colors bg-neutral-50/40 dark:bg-neutral-800/20 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-l-2 border-neutral-200 dark:border-neutral-700 hover:border-emerald-500"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className={`flex-1 text-neutral-800 dark:text-neutral-200 font-serif select-text ${bodySizeClass}`}>
                                {renderStrikethroughAndNotes(block.rawText)}
                              </div>
                              <div className="opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyArticle(block.rawText, (block as any).articleLabel)}
                                  title="Copiar artigo formatado para parecer ou ofício"
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                >
                                  {copiedArticleId === (block as any).articleLabel ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (block.type === 'heading_titulo') {
                        return (
                          <div key={idx} id={block.id} className="pt-6 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                            <h3 className="text-sm font-black tracking-widest uppercase text-neutral-900 dark:text-white text-center">
                              {block.rawText}
                            </h3>
                          </div>
                        );
                      }

                      if (block.type === 'heading_capitulo') {
                        return (
                          <div key={idx} id={block.id} className="pt-4 pb-1">
                            <h4 className="text-xs font-black tracking-wider uppercase text-neutral-700 dark:text-neutral-300 text-center">
                              {block.rawText}
                            </h4>
                          </div>
                        );
                      }

                      return (
                        <p key={idx} id={block.id} className={`my-2 text-neutral-800 dark:text-neutral-300 font-serif select-text ${bodySizeClass}`}>
                          {renderStrikethroughAndNotes(block.rawText)}
                        </p>
                      );
                    })}
                  </div>
                  )}

                  {/* Fecho e Assinatura no Leitor LexML */}
                  {parsedDoc.fecho && (
                    <div className="pt-6 mt-8 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                      <p className="select-text">{parsedDoc.fecho}</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-2 select-text">
                        {parsedDoc.assinatura.nome} — {parsedDoc.assinatura.cargo}
                      </p>
                    </div>
                  )}

                  {/* Ações rápidas mobile quando painel lateral está oculto */}
                  {(law.file_url || law.external_link) && (
                    <div className="md:hidden pt-3 flex flex-wrap gap-2">
                      {law.file_url && (
                        <a
                          href={law.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-3 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Download size={13} />
                          <span>Baixar PDF Original</span>
                        </a>
                      )}
                      {law.external_link && (
                        <a
                          href={law.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink size={13} />
                          <span>Link Oficial</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Rodapé da Norma */}
                  <div className="pt-4 text-xs text-neutral-400 space-y-1">
                    <p>Publicado no Repositório Oficial de {institutionName} em {formatDatePtBr(law.publication_date)}.</p>
                    {law.author && <p>Autoria / Iniciativa: <strong>{law.author}</strong></p>}
                  </div>

                  {/* Card Institucional de Autenticidade do GESTÃO 360 */}
                  <div className="mt-8 p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                          <ShieldCheck size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black tracking-wide uppercase text-white">
                              Texto Estruturado para Consulta Pública • {institutionName}
                            </span>
                            <span className="text-[9px] font-bold bg-emerald-500 text-neutral-950 px-2 py-0.2 rounded-full uppercase">
                              Transparência
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                            Visualização facilitada para leitura e acessibilidade. Para fins jurídicos e comprovação formal, prevalece o documento oficial assinado (PDF original anexo ou Diário Oficial).
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <a 
                          href="https://gestao360.com.br" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 sm:justify-end"
                        >
                          <span>gestao360.com.br</span>
                          <ExternalLink size={12} />
                        </a>
                        <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                          Chave: G360-LEI-{law.number}-{new Date(`${(law.publication_date || '2026').slice(0, 10)}T12:00:00`).getFullYear() || 2026}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Container Especial de Impressão do Modelo Próprio (Visível apenas na Impressão via CSS) */}
              <div id="print-modelo-proprio-container" className="hidden">
                <div className="modelo-proprio-print font-serif text-neutral-900">
                  {/* Timbre Oficial */}
                  <div className="text-center pb-4 mb-6 border-b-2 border-neutral-900 font-sans">
                    {institution?.logo_url && (
                      <img
                        src={institution.logo_url}
                        alt={institutionName}
                        className="h-14 w-auto mx-auto mb-2 object-contain"
                      />
                    )}
                    <div className="text-xs font-black tracking-widest uppercase text-neutral-800">
                      ESTADO DE MATO GROSSO
                    </div>
                    <div className="text-sm font-black tracking-wider uppercase text-neutral-900 mt-0.5">
                      {law.origin_power === 'legislativo' ? 'CÂMARA MUNICIPAL DE VEREADORES' : institutionName.toUpperCase()}
                    </div>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-neutral-600 mt-1">
                      SISTEMA INTEGRADO DE LEGISLAÇÃO MUNICIPAL — GESTÃO 360
                    </div>
                  </div>

                  {/* Epígrafe */}
                  <div className="text-center my-6 space-y-1">
                    <h2 className="text-xl font-black uppercase text-neutral-900 font-serif">
                      {parsedDoc.epigrafe.tipoNumero}
                    </h2>
                    <p className="text-xs font-semibold text-neutral-700 font-serif">
                      {parsedDoc.epigrafe.data}
                    </p>
                  </div>

                  {/* Ementa em destaque */}
                  <div className="flex justify-end my-6">
                    <div className="w-[68%] text-justify text-xs font-serif italic text-neutral-900 leading-relaxed pl-4 border-l-2 border-neutral-800">
                      "{parsedDoc.ementa}"
                    </div>
                  </div>

                  {/* Preâmbulo */}
                  {parsedDoc.preambulo && (
                    <p className="my-5 text-xs font-serif leading-relaxed text-justify text-neutral-900 indent-8">
                      {parsedDoc.preambulo}
                    </p>
                  )}

                  {/* Artigos e Tabelas */}
                  <div className="space-y-3 font-serif text-xs leading-relaxed text-neutral-900 text-justify">
                    {parsedDoc.blocks.map((block, bIdx) => {
                      if (block.type === 'budget_table') {
                        return renderBudgetTableBlock(block as BudgetTableBlock, bIdx, true);
                      }
                      if (block.type === 'data_table') {
                        return renderDataTableBlock(block as DataTableBlock, bIdx, true);
                      }
                      if (block.type === 'article') {
                        return (
                          <p key={bIdx} className="text-xs font-serif leading-relaxed text-justify text-neutral-900 indent-8 my-2">
                            {block.rawText}
                          </p>
                        );
                      }
                      if (block.type === 'heading_titulo') {
                        return (
                          <div key={bIdx} className="pt-4 pb-1 font-bold text-center uppercase tracking-widest text-xs">
                            {block.rawText}
                          </div>
                        );
                      }
                      return (
                        <p key={bIdx} className="my-1 text-xs font-serif leading-relaxed">
                          {block.rawText}
                        </p>
                      );
                    })}
                  </div>

                  {/* Fecho e Assinatura */}
                  <div className="mt-8 pt-4 border-t border-neutral-400 text-center font-serif text-xs">
                    <p className="italic mb-4">
                      Gabinete Municipal, {parsedDoc.epigrafe.data}.
                    </p>
                    <p className="font-black uppercase tracking-wider text-sm">
                      {parsedDoc.assinatura.nome}
                    </p>
                    <p className="text-[11px] text-neutral-700">
                      {parsedDoc.assinatura.cargo}
                    </p>
                  </div>

                  {/* Rodapé Oficial */}
                  <div className="mt-10 pt-3 border-t-2 border-neutral-900 flex items-center justify-between text-[10px] text-neutral-600 font-sans">
                    <div className="space-y-0.5">
                      <span className="font-black text-neutral-900 block">
                        CÓPIA INFORMATIVA PARA CONSULTA PÚBLICA • {institutionName.toUpperCase()}
                      </span>
                      <span className="text-neutral-500 block">
                        Para fins legais, prevalece o documento oficial digitalmente assinado publicado no Diário Oficial.
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-neutral-800">Chave Digital:</span> G360-{law.number}-{new Date(`${(law.publication_date || '2026').slice(0, 10)}T12:00:00`).getFullYear() || 2026}
                    </div>
                  </div>
                </div>
              </div>

              {/* PAINEL DIREITO: FICHA TÉCNICA & GRAFO DE RELAÇÕES */}
              <div className="w-72 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-4 hidden md:flex flex-col shrink-0 overflow-y-auto custom-scrollbar space-y-5">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                    Ficha Técnica & Rastreabilidade
                  </h3>
                  
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-white dark:bg-neutral-800/80 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-0.5">Origem Constitucional</span>
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                        {law.origin_power === 'legislativo' ? (
                          <>
                            <Landmark size={14} className="text-blue-600" />
                            <span>Câmara Municipal</span>
                          </>
                        ) : (
                          <>
                            <Building2 size={14} className="text-emerald-600" />
                            <span>Poder Executivo</span>
                          </>
                        )}
                      </div>
                      {law.materia_numero && (
                        <div className="mt-1 pt-1 border-t border-neutral-100 dark:border-neutral-700/40 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                          Origem: {law.materia_numero}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-800/80 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-0.5">Data de Publicação</span>
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                        <Calendar size={14} className="text-amber-500" />
                        <span>{formatDatePtBr(law.publication_date)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-800/80 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-0.5">Área / Categoria</span>
                      <span className="font-bold text-neutral-900 dark:text-white block">
                        {law.category || 'Geral'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO: DECRETOS REGULAMENTADORES VINCULADOS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <FileCheck2 size={13} className="text-blue-500" />
                      Decretos Regulamentadores
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {relatedRegulations.length}
                    </span>
                  </div>

                  {relatedRegulations.length === 0 ? (
                    <div className="p-3 bg-white dark:bg-neutral-800/60 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 text-center">
                      <p className="text-[11px] text-neutral-400">
                        Nenhum decreto do Executivo regulamentando esta lei registrado até o momento.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {relatedRegulations.map(reg => (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => onSelectRelatedLaw && onSelectRelatedLaw(reg)}
                          className="w-full text-left p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-blue-200/70 dark:border-blue-900/50 hover:border-blue-400 transition-all cursor-pointer group shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                              Decreto {reg.number}
                            </span>
                            <ArrowRight size={11} className="text-neutral-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                          </div>
                          <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-2 mt-0.5">
                            {reg.title}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ANEXOS E LINKS OFICIAIS */}
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                  {law.file_url && (
                    <a
                      href={law.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download size={13} />
                      <span>Baixar Documento Original</span>
                    </a>
                  )}

                  {law.external_link && (
                    <a
                      href={law.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={13} />
                      <span>Diário Oficial Eletrônico</span>
                    </a>
                  )}
                </div>

              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>,
    document.body
  );
};
