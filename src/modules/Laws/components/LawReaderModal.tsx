import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Link2,
  FileCheck2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { MunicipalLaw } from '../../../types';
import { showToast } from '../../../components/ui/Toast';

interface LawReaderModalProps {
  law: MunicipalLaw;
  allLaws?: MunicipalLaw[];
  onClose: () => void;
  onEdit?: (law: MunicipalLaw) => void;
  onSelectRelatedLaw?: (law: MunicipalLaw) => void;
}

interface ParsedSection {
  id: string;
  type: 'titulo' | 'capitulo' | 'artigo' | 'preambulo' | 'texto';
  label: string;
  rawText: string;
  articleNumber?: string;
}

export const LawReaderModal: React.FC<LawReaderModalProps> = ({
  law,
  allLaws = [],
  onClose,
  onEdit,
  onSelectRelatedLaw
}) => {
  const [viewMode, setViewMode] = useState<'compiled' | 'original'>(
    law.compiled_text && law.is_compiled ? 'compiled' : 'original'
  );
  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [tocSearch, setTocSearch] = useState('');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  // Texto ativo conforme o modo selecionado
  const activeText = useMemo(() => {
    if (viewMode === 'compiled' && law.compiled_text) {
      return law.compiled_text;
    }
    return law.full_text || law.ementa;
  }, [viewMode, law]);

  // Parser dos artigos para o sumário lateral
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
      } else if (/^PREÂMBULO/i.test(trimmed)) {
        parsed.push({
          id: `sec-preambulo-${index}`,
          type: 'preambulo',
          label: 'Preâmbulo',
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
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Copiar artigo formatado para citação oficial
  const handleCopyArticle = (articleText: string, articleLabel: string) => {
    const citation = `Conforme o ${articleLabel} da Lei Municipal nº ${law.number} (${law.title}):\n"${articleText.trim()}"`;
    navigator.clipboard.writeText(citation);
    setCopiedArticleId(articleLabel);
    showToast(`${articleLabel} copiado com citação oficial!`, 'success');
    setTimeout(() => setCopiedArticleId(null), 2500);
  };

  // Geração de PDF Oficial da Ficha Normativa
  const handlePrintPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // Tamanho A4
      const { height } = page.getSize();
      
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Faixa Superior Institucional
      page.drawRectangle({
        x: 40,
        y: height - 90,
        width: 515,
        height: 55,
        color: rgb(0.04, 0.23, 0.43) // Azul municipal #003B6F
      });

      page.drawText('ESTADO E MUNICÍPIO — REPOSITÓRIO OFICIAL DE LEGISLAÇÃO', {
        x: 55,
        y: height - 58,
        size: 9,
        font: helveticaBold,
        color: rgb(0.8, 0.9, 1)
      });

      page.drawText(`${law.type.toUpperCase()} Nº ${law.number} — ${law.status.toUpperCase()}`, {
        x: 55,
        y: height - 76,
        size: 13,
        font: helveticaBold,
        color: rgb(1, 1, 1)
      });

      let currentY = height - 120;
      const drawField = (label: string, value: string) => {
        page.drawText(`${label}:`, {
          x: 40,
          y: currentY,
          size: 9,
          font: helveticaBold,
          color: rgb(0.3, 0.3, 0.3)
        });
        page.drawText(value || 'N/A', {
          x: 160,
          y: currentY,
          size: 9,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1)
        });
        currentY -= 16;
      };

      drawField('Tipo de Norma', law.type);
      drawField('Número / Ano', law.number);
      drawField('Título Oficial', law.title);
      drawField('Data de Publicação', law.publication_date);
      drawField('Poder de Origem', law.origin_power === 'legislativo' ? 'Poder Legislativo (Câmara Municipal)' : 'Poder Executivo (Prefeitura)');
      if (law.materia_numero) {
        drawField('Matéria de Origem', law.materia_numero);
      }
      if (law.parent_law_number) {
        drawField('Norma Regulamentada', law.parent_law_number);
      }

      currentY -= 10;
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
        color: rgb(0.04, 0.23, 0.43)
      });

      const words = law.ementa.split(' ');
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
      if (line) {
        page.drawText(line, { x: 50, y: lineY, size: 8, font: helvetica });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ficha_Normativa_${law.number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
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

  // Renderizador com formatação de tachados em Markdown/texto
  const renderFormattedParagraph = (text: string, index: number) => {
    const isHeadingTitulo = /^TÍTULO\s+/i.test(text.trim());
    const isHeadingCapitulo = /^CAPÍTULO\s+/i.test(text.trim()) || /^LIVRO\s+/i.test(text.trim());
    const isArticle = /^(Art\.|Artigo)\s*([0-9ºººªa-zA-Z.-]+)/i.test(text.trim());
    const isParagrafo = /^(§\s*[0-9]+|Parágrafo único)/i.test(text.trim());
    const isInciso = /^[IVXLCDM]+\s*[-–]/i.test(text.trim());

    if (isHeadingTitulo) {
      return (
        <div key={index} id={`sec-titulo-${index}`} className="pt-6 pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-black tracking-widest uppercase text-neutral-900 dark:text-white text-center">
            {text}
          </h3>
        </div>
      );
    }

    if (isHeadingCapitulo) {
      return (
        <div key={index} id={`sec-capitulo-${index}`} className="pt-4 pb-1">
          <h4 className="text-xs font-black tracking-wider uppercase text-neutral-700 dark:text-neutral-300 text-center">
            {text}
          </h4>
        </div>
      );
    }

    if (isArticle) {
      const match = text.trim().match(/^(Art\.|Artigo)\s*([0-9ºººªa-zA-Z.-]+)/i);
      const articleLabel = match ? `Art. ${match[2]}` : 'Artigo';

      // Divide texto com tachados ~~...~~ e anotações *(...)*
      return (
        <div 
          key={index} 
          id={`sec-art-${index}`}
          className="group relative my-3 p-3 rounded-xl transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40 border-l-2 border-transparent hover:border-emerald-500"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 font-serif">
              {renderStrikethroughAndNotes(text)}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 pt-0.5">
              <button
                type="button"
                onClick={() => handleCopyArticle(text, articleLabel)}
                title="Copiar artigo formatado para ofício ou parecer"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              >
                {copiedArticleId === articleLabel ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <p 
        key={index} 
        className={`my-1 text-sm leading-relaxed text-neutral-800 dark:text-neutral-300 font-serif ${
          isParagrafo ? 'pl-4' : isInciso ? 'pl-8' : ''
        }`}
      >
        {renderStrikethroughAndNotes(text)}
      </p>
    );
  };

  // Suporte a tachado ~~texto revogado~~ e anotações *(Redação dada pela Lei...)*
  const renderStrikethroughAndNotes = (content: string) => {
    // Processamento de tachado ~~...~~
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

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-neutral-950/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.96, y: 15 }} 
        animate={{ scale: 1, y: 0 }} 
        exit={{ scale: 0.96, y: 15 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-7xl h-[94vh] rounded-[28px] shadow-2xl flex flex-col border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* =========================================================================
            1. TOPO INTEGRADO DO LEITOR (CABEÇALHO NORMATIVO & AÇÕES)
           ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-50/70 dark:bg-neutral-900/90 shrink-0">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              law.origin_power === 'legislativo'
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              {law.origin_power === 'legislativo' ? <Landmark size={22} /> : <Building2 size={22} />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {law.type}
                </span>
                <span className="text-base font-black text-neutral-900 dark:text-white font-mono">
                  Nº {law.number}
                </span>

                {/* Badge de Vigência */}
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  law.status === 'Em Vigor'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : law.status === 'Regulamentada'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                    : law.status === 'Alterada'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                }`}>
                  {law.status}
                </span>

                {/* Badge de Origem */}
                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                  {law.origin_power === 'legislativo' ? (
                    <>🏛️ Poder Legislativo (Câmara)</>
                  ) : law.origin_power === 'executivo' ? (
                    <>🏢 Poder Executivo (Prefeitura)</>
                  ) : (
                    <>🏛️🏢 Ato Conjunto</>
                  )}
                </span>
              </div>

              <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-1 line-clamp-1">
                {law.title}
              </h2>
            </div>
          </div>

          {/* Controles de Modo & Exportação */}
          <div className="flex items-center gap-2 self-end md:self-center">
            {/* Alternador Texto Compilado vs Texto Original */}
            {law.compiled_text && (
              <div className="flex items-center bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('compiled')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'compiled'
                      ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                  title="Exibe o texto consolidado com anotações de alterações vigentes"
                >
                  <Sparkles size={13} />
                  <span>Texto Compilado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('original')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'original'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                  title="Exibe a redação original exatamente como sancionada"
                >
                  Texto Original
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handlePrintPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Gerar e baixar PDF Oficial da Ficha Normativa"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">{isGeneratingPdf ? 'Gerando...' : 'Exportar PDF'}</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(law);
                }}
                className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Editar
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. CORPO DIVIDIDO EM 3 PAINÉIS (SUMÁRIO, TEXTO EDITORIAL, FICHA TÉCNICA)
           ========================================================================= */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* PAINEL ESQUERDO: SUMÁRIO NAVEGÁVEL POR ARTIGOS */}
          <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-3 hidden lg:flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <BookOpen size={13} className="text-emerald-500" />
                Índice da Norma
              </span>
              <span className="text-[10px] font-bold text-neutral-400">
                {sections.filter(s => s.type === 'artigo').length} arts.
              </span>
            </div>

            {/* Busca Rápida no Sumário */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" size={13} />
              <input
                type="text"
                placeholder="Ir para artigo (ex: 5)..."
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

          {/* PAINEL CENTRAL: TEXTO DA NORMA (EDITORIAL JURÍDICO) */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-white dark:bg-neutral-900">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Ementa em Destaque */}
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-5 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 block mb-1">
                  Ementa Oficial
                </span>
                <p className="text-sm font-serif italic text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  "{law.ementa}"
                </p>
              </div>

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

              {/* Corpo de Artigos */}
              <div className="space-y-1 text-neutral-900 dark:text-neutral-100">
                {activeText.split('\n').map((line, idx) => renderFormattedParagraph(line, idx))}
              </div>

              {/* Rodapé da Norma */}
              <div className="pt-8 mt-12 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 space-y-1">
                <p>Publicado no Repositório Oficial do Município em {new Date(law.publication_date).toLocaleDateString('pt-BR')}.</p>
                {law.author && <p>Autoria / Iniciativa: <strong>{law.author}</strong></p>}
              </div>
            </div>
          </div>

          {/* PAINEL DIREITO: FICHA TÉCNICA & GRAFO DE RELAÇÕES PREFEITURA-CÂMARA */}
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
                    <span>{new Date(law.publication_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-neutral-800/80 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-0.5">Área / Categoria</span>
                  <span className="font-bold text-neutral-900 dark:text-white block">
                    {law.category}
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

            {/* SEÇÃO: LEI MÃE SE ESTE ATO FOR UM DECRETO REGULAMENTADOR */}
            {law.parent_law_number && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 block mb-1">
                  Regulamenta a Norma:
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                  {law.parent_law_number}
                </span>
                {law.parent_law_title && (
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-0.5">
                    {law.parent_law_title}
                  </p>
                )}
              </div>
            )}

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
      </motion.div>
    </motion.div>
  );
};

