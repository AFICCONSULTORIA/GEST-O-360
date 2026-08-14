import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MOCK_TEMPLATES } from '../../lib/mockData';
import { DocumentTemplate, AdminUser, Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';

const { 
  Plus, Search, Edit2, Trash2, FileText, Download, Clock, FileBadge, X, ChevronLeft,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Heading1, Heading2, Printer, Save, Send, Undo, Redo, Indent, Outdent,
  TableProperties, ArrowUpDown, Minus, Image: ImageIcon, Scissors, Copy, ClipboardPaste,
  Type, Highlighter, Palette, Check, Search: SearchIcon, Replace, ZoomIn, ZoomOut, 
  ChevronDown, ChevronUp, XCircle, LayoutTemplate, Link: LinkIcon, Wand2, PenTool, Workflow
} = LucideIcons;

const FONT_FAMILIES = [
  'Times New Roman', 'Arial', 'Inter', 'Courier New', 'Georgia', 'Verdana', 'Trebuchet MS', 'Tahoma'
];

const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF',
  '#9900FF', '#FF00FF', '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3',
  '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
];

// -------------------------------------------------------------
// WEB DOCUMENT INTERFACES
// -------------------------------------------------------------
export interface WebDocument {
  id: string;
  title: string;
  header?: string;
  content: string;
  footer?: string;
  createdAt: string;
  updatedAt: string;
  status: 'Rascunho' | 'Finalizado';
}

// -------------------------------------------------------------
// CONFIRM MODAL
// -------------------------------------------------------------
const ConfirmModal = ({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', isDestructive = false, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel} />
      <div className="relative bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-white transition-all shadow-xl hover:scale-105 ${isDestructive ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// UNCONTROLLED EDITABLE (Prevents React Re-renders from breaking typing)
// -------------------------------------------------------------
const UncontrolledEditable = ({ 
  innerRef, className, style, onFocus, onBlur, onInput, onKeyDown, onContextMenu, onDragOver, onDrop, initialHtml 
}: any) => {
  React.useEffect(() => {
    if (innerRef.current && !innerRef.current.innerHTML) {
      innerRef.current.innerHTML = initialHtml;
    }
  }, []);

  return (
    <div 
      ref={innerRef}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
};

// -------------------------------------------------------------
// EDITOR COMPONENT
// -------------------------------------------------------------
const DocumentEditor = ({ doc, onClose, onSave, currentUser, currentInstitution }: { doc?: WebDocument, onClose: () => void, onSave: (d: WebDocument, silent?: boolean) => void, currentUser?: AdminUser | null, currentInstitution?: Institution | null }) => {
  const DEFAULT_CONTENT = '<p style="font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.5;"><br></p>';
  
  const [title, setTitle] = React.useState(doc?.title || 'Novo Documento Sem Título');
  const [header, setHeader] = React.useState(doc?.header || '<p><br></p>');
  const [content, setContent] = React.useState(doc?.content || DEFAULT_CONTENT);
  const [footer, setFooter] = React.useState(doc?.footer || '<p><br></p>');
  const [isSpacingMenuOpen, setIsSpacingMenuOpen] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number } | null>(null);
  const [activeRegion, setActiveRegion] = React.useState<'header'|'body'|'footer'>('body');
  const [pages, setPages] = React.useState(1);
  const [confirmConfig, setConfirmConfig] = React.useState<any>(null);
  const initialHeader = React.useRef(doc?.header || '<p><br></p>');
  const initialContent = React.useRef(doc?.content || DEFAULT_CONTENT);
  const initialFooter = React.useRef(doc?.footer || '<p><br></p>');

  // Fase 1: novos estados
  const [selectedFont, setSelectedFont] = React.useState('Times New Roman');
  const [selectedSize, setSelectedSize] = React.useState('12');
  const [showTextColorPicker, setShowTextColorPicker] = React.useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = React.useState(false);
  const [textColor, setTextColor] = React.useState('#000000');
  const [highlightColor, setHighlightColor] = React.useState('#FFFF00');
  const [activeFormats, setActiveFormats] = React.useState<Record<string, boolean>>({});
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);
  const isDirtyRef = React.useRef(false);

  // Fase 2: novos estados
  const [zoom, setZoom] = React.useState(100);
  const [showFindReplace, setShowFindReplace] = React.useState(false);
  const [findText, setFindText] = React.useState('');
  const [replaceText, setReplaceText] = React.useState('');
  const [findCount, setFindCount] = React.useState(0);
  const [showTableGrid, setShowTableGrid] = React.useState(false);
  const [tableGridHover, setTableGridHover] = React.useState({ rows: 0, cols: 0 });
  const [showMarginsMenu, setShowMarginsMenu] = React.useState(false);
  const [margins, setMargins] = React.useState<'normal'|'narrow'|'wide'>('normal');
  const [showGuides, setShowGuides] = React.useState(true);
  const [showSmartVars, setShowSmartVars] = React.useState(false);

  const insertSmartVar = (variableName: string) => {
    const varHtml = `<span style="background-color: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; padding: 2px 4px; border-radius: 4px; font-weight: bold; font-family: Inter, sans-serif; font-size: 10px;" data-smart-var="true">{{${variableName}}}</span>&nbsp;`;
    execCmd('insertHTML', varHtml);
    setShowSmartVars(false);
  };

  const replaceSmartVars = () => {
    let currentHtml = bodyRef.current?.innerHTML || '';
    
    const vars: Record<string, string> = {
      'NOME_USUARIO': currentUser?.name || '[Nome do Usuário]',
      'CARGO_USUARIO': currentUser?.role || '[Cargo do Usuário]',
      'NOME_MUNICIPIO': currentInstitution?.name || '[Nome do Município]',
      'NOME_SECRETARIA': currentInstitution?.name || 'Prefeitura Municipal',
      'NOME_SECRETARIA_SIGLA': 'PM',
      'DATA_CURTA': new Date().toLocaleDateString('pt-BR'),
      'DATA_EXTENSO': new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
      'ASSINATURA': `<div style="text-align: center; margin-top: 50px;"><div style="width: 250px; border-top: 1px solid black; margin: 0 auto; margin-bottom: 8px;"></div><p style="margin:0; font-weight:bold;">${currentUser?.name || '[Nome]'}</p><p style="margin:0;">${currentUser?.role || '[Cargo]'}</p></div>`
    };

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml;
    
    const varSpans = tempDiv.querySelectorAll('span[data-smart-var="true"]');
    varSpans.forEach(span => {
      const text = span.textContent || '';
      const varName = text.replace(/[{}]/g, '');
      if (vars[varName] !== undefined) {
        const replacement = document.createElement('span');
        replacement.innerHTML = vars[varName];
        span.replaceWith(...Array.from(replacement.childNodes));
      }
    });
    
    let newHtml = tempDiv.innerHTML;
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      newHtml = newHtml.replace(regex, value);
    }
    
    if (bodyRef.current) {
      bodyRef.current.innerHTML = newHtml;
      setContent(newHtml);
      markDirty();
      showToast('Variáveis processadas com sucesso!', 'success');
    }
  };

  const generateHeaderFooter = () => {
    if (headerRef.current) {
      const logoHtml = currentInstitution?.logo_url ? `<img src="${currentInstitution.logo_url}" style="height: 60px; object-fit: contain; margin-bottom: 10px;" />` : '';
      const newHeader = `<div style="text-align: center; font-family: 'Times New Roman', serif;">
        ${logoHtml}
        <h3 style="margin: 0; font-size: 14pt; font-weight: bold;">MUNICÍPIO DE ${currentInstitution?.name?.toUpperCase() || 'MUNICÍPIO'}</h3>
        <p style="margin: 0; font-size: 12pt;">ESTADO DE MATO GROSSO</p>
        <div style="width: 100%; border-bottom: 2px solid #000; margin-top: 10px; margin-bottom: 2px;"></div>
        <div style="width: 100%; border-bottom: 1px solid #000;"></div>
      </div>`;
      headerRef.current.innerHTML = newHeader;
      setHeader(newHeader);
    }
    if (footerRef.current) {
      const newFooter = `<div style="text-align: center; font-family: 'Times New Roman', serif; font-size: 10pt; color: #666; border-top: 1px solid #000; padding-top: 10px;">
        <p style="margin: 0;">Prefeitura Municipal de ${currentInstitution?.name || 'Município'}</p>
        <p style="margin: 0;">Este é um documento oficial gerado eletronicamente no sistema GESTÃO 360.</p>
      </div>`;
      footerRef.current.innerHTML = newFooter;
      setFooter(newFooter);
    }
    markDirty();
    showToast('Timbre e rodapé oficiais aplicados!', 'success');
  };

  const MARGIN_PRESETS = {
    normal: { label: 'Normal', px: '5rem' },    // ~2cm
    narrow: { label: 'Estreita', px: '3rem' },   // ~1.27cm
    wide: { label: 'Larga', px: '6.5rem' },      // ~2.54cm
  };
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const savedSelectionRef = React.useRef<Range | null>(null);

  // ---- Drag and Drop de Imagens ----
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          const sel = window.getSelection();
          if (sel && (e.clientX !== undefined && e.clientY !== undefined)) {
            if (document.caretRangeFromPoint) {
              const range = document.caretRangeFromPoint(e.clientX, e.clientY);
              if (range) {
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
          const imgHtml = `<img src="${base64}" style="max-height: 120px; object-fit: contain; margin: 0; padding: 0;" />`;
          execCmd('insertHTML', imgHtml);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // ---- Confirmação ao sair sem salvar ----
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja sair mesmo assim?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ---- Aplicar fonte e tamanho padrão no corpo ao montar ----
  React.useEffect(() => {
    if (bodyRef.current && !doc?.content) {
      bodyRef.current.style.fontFamily = 'Times New Roman, serif';
      bodyRef.current.style.fontSize = '12pt';
      bodyRef.current.style.lineHeight = '1.5';
    }
  }, []);

  // ---- Page counter ----
  React.useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const height = entry.contentRect.height;
        setPages(Math.max(1, Math.ceil(height / 1122.5)));
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ---- Fechar menus ao clicar fora ----
  React.useEffect(() => {
    const closeMenu = () => { setContextMenu(null); setShowTextColorPicker(false); setShowHighlightPicker(false); };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  // ---- Monitorar estado ativo da formatação ----
  React.useEffect(() => {
    const update = () => {
      const newFormats = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        justifyFull: document.queryCommandState('justifyFull'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      };
      
      setActiveFormats(prev => {
        let changed = false;
        for (const k in newFormats) {
          if (prev[k] !== newFormats[k as keyof typeof newFormats]) {
            changed = true;
            break;
          }
        }
        return changed ? newFormats : prev;
      });

      // Atualizar fonte e tamanho atuais
      const fn = document.queryCommandValue('fontName');
      if (fn) {
        const parsedFn = fn.replace(/"/g, '');
        setSelectedFont(prev => prev !== parsedFn ? parsedFn : prev);
      }
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  // ---- Auto-save a cada 30s ----
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        handleSave('Rascunho', true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [title, header, content, footer]);

  // ---- Marcar conteúdo como modificado ----
  const markDirty = () => { isDirtyRef.current = true; };

  const getActiveRef = () => {
    if (activeRegion === 'header') return headerRef;
    if (activeRegion === 'footer') return footerRef;
    return bodyRef;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    markDirty();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportDocx = () => {
    const headerHtml = headerRef.current?.innerHTML || '';
    const bodyHtml = bodyRef.current?.innerHTML || '';
    const footerHtml = footerRef.current?.innerHTML || '';

    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 21cm 29.7cm;
            margin: 2cm 2.5cm 2cm 2.5cm;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-header: h1;
            mso-footer: f1;
          }
          div.Section1 {
            page: WordSection1;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          td, th {
            border: 1px solid #d4d4d8;
            padding: 8px;
          }
          p.MsoHeader, li.MsoHeader, div.MsoHeader {
            margin: 0in;
            margin-bottom: .0001pt;
            mso-pagination: widow-orphan;
          }
          p.MsoFooter, li.MsoFooter, div.MsoFooter {
            margin: 0in;
            margin-bottom: .0001pt;
            mso-pagination: widow-orphan;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          <div style="mso-element:header" id="h1">
            <div class="MsoHeader">
              ${headerHtml}
            </div>
          </div>
          <div>
            ${bodyHtml}
          </div>
          <div style="mso-element:footer" id="f1">
            <div class="MsoFooter">
              ${footerHtml}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'documento'}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Documento exportado para Word (.docx)!', 'success');
  };

  const handleSave = (status: 'Rascunho' | 'Finalizado', silent = false) => {
    onSave({
      id: doc?.id || Math.random().toString(36).substr(2, 9),
      title,
      header: headerRef.current?.innerHTML || header,
      content: bodyRef.current?.innerHTML || content,
      footer: footerRef.current?.innerHTML || footer,
      createdAt: doc?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status
    }, silent);
    isDirtyRef.current = false;
    setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    if (!silent) showToast(`Documento ${status === 'Rascunho' ? 'salvo como rascunho' : 'finalizado'}!`, 'success');
  };

  const insertTableWithSize = (rows: number, cols: number) => {
    let rowsHtml = '';
    for (let r = 0; r < rows; r++) {
      let cellsHtml = '';
      for (let c = 0; c < cols; c++) {
        cellsHtml += '<td style="border: 1px solid #d4d4d8; padding: 0.75rem;"><br></td>';
      }
      rowsHtml += `<tr>${cellsHtml}</tr>`;
    }
    const tableHTML = `<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;"><tbody>${rowsHtml}</tbody></table><p><br></p>`;
    execCmd('insertHTML', tableHTML);
    setShowTableGrid(false);
  };

  // ---- Buscar e Substituir ----
  const getWordCount = () => {
    const text = bodyRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    return { words, chars };
  };

  const highlightFinds = () => {
    if (!bodyRef.current || !findText) { setFindCount(0); return; }
    // Remove existing highlights
    clearFindHighlights();
    const walker = document.createTreeWalker(bodyRef.current, NodeFilter.SHOW_TEXT);
    const ranges: Range[] = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      let idx = 0;
      while ((idx = text.toLowerCase().indexOf(findText.toLowerCase(), idx)) !== -1) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + findText.length);
        ranges.push(range);
        idx += findText.length;
      }
    }
    setFindCount(ranges.length);
    ranges.forEach(range => {
      const mark = document.createElement('mark');
      mark.style.backgroundColor = '#FBBF24';
      mark.style.color = '#000';
      mark.dataset.findHighlight = 'true';
      try { range.surroundContents(mark); } catch {}
    });
  };

  const clearFindHighlights = () => {
    if (!bodyRef.current) return;
    const marks = bodyRef.current.querySelectorAll('mark[data-find-highlight]');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    });
  };

  const handleReplaceOne = () => {
    if (!bodyRef.current || !findText) return;
    const mark = bodyRef.current.querySelector('mark[data-find-highlight]');
    if (mark) {
      mark.replaceWith(document.createTextNode(replaceText));
      markDirty();
      highlightFinds();
    }
  };

  const handleReplaceAll = () => {
    if (!bodyRef.current || !findText) return;
    const marks = bodyRef.current.querySelectorAll('mark[data-find-highlight]');
    marks.forEach(mark => mark.replaceWith(document.createTextNode(replaceText)));
    markDirty();
    setFindCount(0);
    showToast(`${marks.length} ocorrência(s) substituída(s)`, 'success');
  };

  React.useEffect(() => {
    if (showFindReplace && findText) {
      const timer = setTimeout(highlightFinds, 300);
      return () => clearTimeout(timer);
    } else {
      clearFindHighlights();
      setFindCount(0);
    }
  }, [findText, showFindReplace]);

  const handleOpenSpacingMenu = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
    setIsSpacingMenuOpen(!isSpacingMenuOpen);
  };

  const handleInsertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const sel = window.getSelection();
        if (sel && savedSelectionRef.current) {
          sel.removeAllRanges();
          sel.addRange(savedSelectionRef.current);
        }
        const imgHtml = `<img src="${base64}" style="max-height: 120px; object-fit: contain; margin: 0; padding: 0;" />`;
        execCmd('insertHTML', imgHtml);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applySpacing = (next: string) => {
    const selection = window.getSelection();
    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    }
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.anchorNode;
      if (node && node.nodeType === 3) node = node.parentNode;
      const activeRef = getActiveRef();
      if (node === activeRef.current) {
        execCmd('formatBlock', 'p');
        node = window.getSelection()?.anchorNode?.parentNode as Node | null;
      }
      while (node && !['P', 'DIV', 'TD', 'LI', 'H1', 'H2'].includes(node.nodeName) && node !== activeRef.current) {
        node = node.parentNode;
      }
      if (node && node !== activeRef.current) {
        const el = node as HTMLElement;
        el.style.lineHeight = next;
        if (activeRegion === 'header') setHeader(headerRef.current?.innerHTML || header);
        else if (activeRegion === 'footer') setFooter(footerRef.current?.innerHTML || footer);
        else setContent(bodyRef.current?.innerHTML || content);
        showToast(`Espaçamento: ${next === '1' ? 'Simples' : next === '1.5' ? '1,5' : next === '2' ? 'Duplo' : next}`, 'success');
      } else {
        showToast('Selecione o texto e tente novamente.', 'info');
      }
    }
    setIsSpacingMenuOpen(false);
  };

  // ---- Aplicar fonte ----
  const applyFontFamily = (family: string) => {
    setSelectedFont(family);
    execCmd('fontName', family);
  };

  // ---- Aplicar tamanho de fonte via CSS inline (mais preciso que fontSize do execCommand) ----
  const applyFontSize = (size: string) => {
    setSelectedSize(size);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      execCmd('fontSize', '7');
      const fonts = getActiveRef().current?.querySelectorAll('font[size="7"]');
      fonts?.forEach(f => {
        f.removeAttribute('size');
        f.style.fontSize = size + 'pt';
      });
      markDirty();
    }
  };

  // ---- Aplicar cor de texto ----
  const applyTextColor = (color: string) => {
    setTextColor(color);
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
    execCmd('foreColor', color);
    setShowTextColorPicker(false);
  };

  // ---- Aplicar cor de realce ----
  const applyHighlightColor = (color: string) => {
    setHighlightColor(color);
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
    execCmd('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  // ---- Toolbar Button com estado ativo ----
  const ToolbarButton = ({ icon: Icon, cmd, val, title, onClick, active }: any) => (
    <button 
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick || (() => execCmd(cmd, val))} 
      className={`p-2 rounded-lg transition-colors print:hidden ${
        (active || (cmd && activeFormats[cmd])) 
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' 
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      <Icon size={16} />
    </button>
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      let cmd = '';

      if (key === 's') { e.preventDefault(); handleSave('Rascunho'); return; }
      if (key === 'p') { e.preventDefault(); handlePrint(); return; }
      if (key === 'h') { e.preventDefault(); setShowFindReplace(!showFindReplace); return; }
      if (key === 'f') { e.preventDefault(); setShowFindReplace(true); return; }
      if (e.shiftKey && key === 's') {
        e.preventDefault();
        execCmd('strikeThrough');
        return;
      }
      if (key === 'k' || key === 'l') {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        }
        const url = window.prompt('Digite a URL do link:');
        if (url) {
          if (sel && savedSelectionRef.current) {
            sel.removeAllRanges();
            sel.addRange(savedSelectionRef.current);
          }
          execCmd('createLink', url);
        }
        return;
      }
      
      switch (key) {
        case 'n': cmd = 'bold'; break;
        case 'b': cmd = 'bold'; break;
        case 'i': cmd = 'italic'; break;
        case 'u': cmd = 'underline'; break;
        case 'e': cmd = 'justifyCenter'; break;
        case 'j': cmd = 'justifyFull'; break;
        case 'q': cmd = 'justifyLeft'; break;
        case 'd': cmd = 'justifyRight'; break;
      }

      if (cmd) {
        e.preventDefault();
        execCmd(cmd);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      execCmd('insertHTML', '&emsp;&emsp;');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="w-full flex flex-col -mt-8"
    >
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden shadow-sm rounded-t-3xl -mx-4 sm:mx-0">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => {
            if (isDirtyRef.current) {
              setConfirmConfig({
                title: 'Alterações não salvas',
                message: 'Você tem alterações que ainda não foram salvas. Se sair agora, perderá o trabalho feito desde o último salvamento.',
                confirmText: 'Sair sem salvar',
                isDestructive: true,
                onConfirm: () => { setConfirmConfig(null); onClose(); },
              });
              return;
            }
            onClose();
          }} className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-xs font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
            <ChevronLeft size={16} /> Voltar
          </button>
          <div className="flex-1 max-w-lg border-l border-neutral-200 dark:border-neutral-800 pl-4 ml-2">
            <input 
              value={title}
              onChange={e => { setTitle(e.target.value); markDirty(); }}
              className="w-full bg-transparent text-lg font-black text-neutral-900 dark:text-white outline-none border-b-2 border-transparent focus:border-neutral-900 dark:focus:border-white px-2 py-1 transition-all"
              placeholder="Título do Documento..."
            />
          </div>
          {lastSaved && (
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
              <Check size={12} className="text-emerald-500" /> Salvo às {lastSaved}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            <Printer size={16} /> Imprimir / PDF
          </button>
          <button onClick={handleExportDocx} className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors">
            <Download size={16} /> Exportar Word
          </button>
          <button onClick={() => handleSave('Rascunho')} className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-colors">
            <Save size={16} /> Salvar Rascunho
          </button>
          <button onClick={() => { handleSave('Finalizado'); showToast('Documento finalizado!', 'success'); handlePrint(); }} className="flex items-center gap-2 px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl shadow-neutral-900/10 dark:shadow-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
            <Send size={16} /> Protocolar
          </button>
        </div>
      </div>

      {/* Find & Replace Panel */}
      {showFindReplace && (
        <div className="sticky top-[73px] z-20 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-6 py-3 print:hidden -mx-4 sm:mx-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <SearchIcon size={16} className="text-amber-600 shrink-0" />
              <input
                type="text"
                value={findText}
                onChange={e => setFindText(e.target.value)}
                placeholder="Buscar..."
                className="flex-1 bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />
              {findText && <span className="text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">{findCount} encontrado(s)</span>}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Replace size={16} className="text-amber-600 shrink-0" />
              <input
                type="text"
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                placeholder="Substituir por..."
                className="flex-1 bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex items-center gap-1">
              <button onMouseDown={e => e.preventDefault()} onClick={handleReplaceOne} className="px-3 py-1.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg text-xs font-bold hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors">Substituir</button>
              <button onMouseDown={e => e.preventDefault()} onClick={handleReplaceAll} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors">Substituir Tudo</button>
              <button onClick={() => { clearFindHighlights(); setShowFindReplace(false); setFindText(''); setReplaceText(''); }} className="p-1.5 text-amber-600 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"><X size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Toolbar */}
      <div className={`sticky ${showFindReplace ? 'top-[117px]' : 'top-[73px]'} z-20 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2 flex flex-wrap items-center justify-center gap-1 print:hidden shadow-sm -mx-4 sm:mx-0`}>
        
        <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleInsertImage} />
        
        {/* Font Family Selector */}
        <select 
          value={selectedFont}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { applyFontFamily(e.target.value); }}
          className="h-8 px-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none cursor-pointer min-w-[130px]"
          title="Fonte"
        >
          {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>

        {/* Font Size Selector */}
        <select 
          value={selectedSize}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { applyFontSize(e.target.value); }}
          className="h-8 px-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none cursor-pointer w-16"
          title="Tamanho da Fonte"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}
        </select>

        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
        
        <ToolbarButton icon={Undo} cmd="undo" title="Desfazer (Ctrl+Z)" />
        <ToolbarButton icon={Redo} cmd="redo" title="Refazer (Ctrl+Y)" />
        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
        <ToolbarButton icon={Heading1} cmd="formatBlock" val="H1" title="Título 1" />
        <ToolbarButton icon={Heading2} cmd="formatBlock" val="H2" title="Título 2" />
        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
        <ToolbarButton icon={Bold} cmd="bold" title="Negrito (Ctrl+N)" />
        <ToolbarButton icon={Italic} cmd="italic" title="Itálico (Ctrl+I)" />
        <ToolbarButton icon={Underline} cmd="underline" title="Sublinhado (Ctrl+U)" />
        <ToolbarButton icon={Strikethrough} cmd="strikeThrough" title="Tachado" />
        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
        
        {/* Text Color */}
        <div className="relative">
          <button
            type="button"
            title="Cor do Texto"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
              setShowTextColorPicker(!showTextColorPicker);
              setShowHighlightPicker(false);
            }}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <div className="flex flex-col items-center gap-0.5">
              <Type size={14} />
              <div className="w-4 h-1 rounded-full" style={{ backgroundColor: textColor }} />
            </div>
          </button>
          {showTextColorPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTextColorPicker(false)} />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-3 z-50 w-max">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Cor do Texto</p>
                <div className="grid grid-cols-10 gap-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => applyTextColor(c)}
                      className={`w-5 h-5 rounded border border-neutral-200 dark:border-neutral-700 hover:scale-125 transition-transform ${textColor === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Highlight Color */}
        <div className="relative">
          <button
            type="button"
            title="Cor de Realce (Marca-Texto)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
              setShowHighlightPicker(!showHighlightPicker);
              setShowTextColorPicker(false);
            }}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <div className="flex flex-col items-center gap-0.5">
              <Highlighter size={14} />
              <div className="w-4 h-1 rounded-full" style={{ backgroundColor: highlightColor }} />
            </div>
          </button>
          {showHighlightPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHighlightPicker(false)} />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-3 z-50 w-max">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Cor de Realce</p>
                <div className="grid grid-cols-10 gap-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => applyHighlightColor(c)}
                      className={`w-5 h-5 rounded border border-neutral-200 dark:border-neutral-700 hover:scale-125 transition-transform ${highlightColor === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => applyHighlightColor('transparent')}
                  className="mt-2 w-full text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-bold uppercase tracking-widest py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                >
                  Remover Realce
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
        <ToolbarButton icon={AlignLeft} cmd="justifyLeft" title="Alinhar à Esquerda (Ctrl+Q)" />
        <ToolbarButton icon={AlignCenter} cmd="justifyCenter" title="Centralizar (Ctrl+E)" />
        <ToolbarButton icon={AlignRight} cmd="justifyRight" title="Alinhar à Direita (Ctrl+D)" />
        <ToolbarButton icon={AlignJustify} cmd="justifyFull" title="Justificado (Ctrl+J)" />
        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
        <ToolbarButton icon={List} cmd="insertUnorderedList" title="Lista" />
        <ToolbarButton icon={ListOrdered} cmd="insertOrderedList" title="Lista Numerada" />
        <ToolbarButton icon={Indent} cmd="indent" title="Aumentar Recuo (Tab)" />
        <ToolbarButton icon={Outdent} cmd="outdent" title="Diminuir Recuo" />
        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
        <ToolbarButton 
          icon={ImageIcon} 
          onClick={() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
            fileInputRef.current?.click();
          }} 
          title="Inserir Imagem / Timbre" 
        />
        
        {/* Table Grid Picker */}
        <div className="relative">
          <ToolbarButton 
            icon={TableProperties} 
            onClick={() => setShowTableGrid(!showTableGrid)} 
            title="Inserir Tabela" 
          />
          {showTableGrid && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTableGrid(false)} />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-3 z-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Tabela {tableGridHover.rows > 0 ? `${tableGridHover.rows}×${tableGridHover.cols}` : ''}</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {Array.from({ length: 8 }).map((_, row) =>
                    Array.from({ length: 8 }).map((_, col) => (
                      <button
                        key={`${row}-${col}`}
                        onMouseEnter={() => setTableGridHover({ rows: row + 1, cols: col + 1 })}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => insertTableWithSize(row + 1, col + 1)}
                        className={`w-5 h-5 border transition-colors ${
                          row < tableGridHover.rows && col < tableGridHover.cols
                            ? 'bg-blue-500 border-blue-600'
                            : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        <ToolbarButton icon={Minus} cmd="insertHorizontalRule" title="Linha Horizontal" />
        
        <div className="relative">
          <ToolbarButton 
            icon={ArrowUpDown} 
            onClick={handleOpenSpacingMenu} 
            title="Espaçamento de Linha" 
          />
          {isSpacingMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSpacingMenuOpen(false)} />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-2 w-40 z-50">
                {[
                  { label: '1.0 (Simples)', value: '1' },
                  { label: '1.15', value: '1.15' },
                  { label: '1.5 (Padrão)', value: '1.5' },
                  { label: '2.0 (Duplo)', value: '2' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySpacing(opt.value)}
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>
        
        {/* Margins */}
        <div className="relative">
          <ToolbarButton 
            icon={LayoutTemplate} 
            onClick={() => setShowMarginsMenu(!showMarginsMenu)} 
            title="Margens do Documento" 
          />
          {showMarginsMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMarginsMenu(false)} />
              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-2 w-44 z-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-4 pb-1">Margens</p>
                {(Object.entries(MARGIN_PRESETS) as [string, {label:string, px:string}][]).map(([key, preset]) => (
                  <button
                    key={key}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setMargins(key as any); setShowMarginsMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center justify-between ${
                      margins === key ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {preset.label}
                    {margins === key && <Check size={14} className="text-emerald-500" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Smart Variables Dropdown */}
        <div className="relative">
          <button
            type="button"
            title="Campos Inteligentes"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowSmartVars(!showSmartVars)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-lg transition-colors border border-sky-100 dark:border-sky-800"
          >
            <Workflow size={14} /> Variáveis
          </button>
          {showSmartVars && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSmartVars(false)} />
              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-2 w-56 z-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-4 pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">Inserir Campo</p>
                {[
                  { label: 'Data (Extenso)', value: 'DATA_EXTENSO' },
                  { label: 'Data (Curta)', value: 'DATA_CURTA' },
                  { label: 'Nome do Usuário', value: 'NOME_USUARIO' },
                  { label: 'Cargo do Usuário', value: 'CARGO_USUARIO' },
                  { label: 'Município', value: 'NOME_MUNICIPIO' },
                  { label: 'Bloco de Assinatura', value: 'ASSINATURA' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertSmartVar(opt.value)}
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-900/20 dark:hover:text-sky-400 font-medium transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Process Variables Action */}
        <button
          type="button"
          title="Processar Variáveis (Preencher com dados reais)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={replaceSmartVars}
          className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
        >
          <Wand2 size={16} />
        </button>

        {/* Generate Header/Footer Action */}
        <button
          type="button"
          title="Gerar Timbre Oficial"
          onMouseDown={(e) => e.preventDefault()}
          onClick={generateHeaderFooter}
          className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 ml-1"
        >
          <PenTool size={16} />
        </button>

        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center"></div>

        {/* Buscar */}
        <ToolbarButton 
          icon={SearchIcon} 
          onClick={() => setShowFindReplace(!showFindReplace)} 
          title="Buscar e Substituir (Ctrl+H)" 
          active={showFindReplace}
        />
      </div>

      {/* A4 Page Container */}
      <div className="py-12 print:py-0 w-full flex justify-center relative">
        
        {/* Floating Status Bar */}
        <div className="fixed bottom-6 right-6 flex items-center gap-3 print:hidden z-50">
          {/* Word Count */}
          <div className="bg-neutral-800 text-neutral-300 px-4 py-2 rounded-xl shadow-lg font-medium text-xs flex items-center gap-3">
            <span>{getWordCount().words} palavras</span>
            <span className="w-px h-3 bg-neutral-600"></span>
            <span>{getWordCount().chars} caracteres</span>
          </div>
          {/* Zoom Controls */}
          <div className="bg-neutral-800 text-white px-2 py-1 rounded-xl shadow-lg font-medium text-xs flex items-center gap-1">
            <button onClick={() => setZoom(Math.max(50, zoom - 25))} className="p-1.5 hover:bg-neutral-700 rounded-lg transition-colors" title="Diminuir Zoom"><ZoomOut size={14} /></button>
            <button onClick={() => setZoom(100)} className="px-2 py-1 hover:bg-neutral-700 rounded-lg transition-colors min-w-[48px] text-center" title="Resetar Zoom">{zoom}%</button>
            <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-1.5 hover:bg-neutral-700 rounded-lg transition-colors" title="Aumentar Zoom"><ZoomIn size={14} /></button>
          </div>
          {/* Guides Toggle */}
          <button 
            onClick={() => setShowGuides(!showGuides)} 
            className={`px-3 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 transition-colors print:hidden ${
              showGuides 
                ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={showGuides ? 'Ocultar Guias Visuais' : 'Mostrar Guias Visuais'}
          >
            <LayoutTemplate size={14} />
            <span className="hidden md:inline">{showGuides ? 'Ocultar Guias' : 'Mostrar Guias'}</span>
          </button>
          {/* Page Counter */}
          <div className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
            <FileText size={16} />
            {pages} {pages === 1 ? 'Página' : 'Páginas'}
          </div>
        </div>

        <div 
          ref={containerRef}
          className="w-[21cm] min-h-[29.7cm] bg-white shadow-2xl print:shadow-none print:w-full print:max-w-none mx-4 sm:mx-auto relative transition-transform origin-top cursor-text"
          style={{ transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined, marginBottom: zoom < 100 ? `calc(29.7cm * ${(zoom/100) - 1})` : undefined }}
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'TD' || (e.target as HTMLElement).tagName === 'TABLE') {
              bodyRef.current?.focus();
            }
          }}
        >
          {/* Visual Ruler */}
          {showGuides && (
            <div className="w-full h-7 bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 relative flex items-center print:hidden select-none z-10">
              {/* Left Margin Shading */}
              <div className="absolute inset-y-0 left-0 bg-neutral-200/50 dark:bg-neutral-700/50 border-r border-neutral-300 dark:border-neutral-600" style={{ width: MARGIN_PRESETS[margins].px }} />
              
              {/* Right Margin Shading */}
              <div className="absolute inset-y-0 right-0 bg-neutral-200/50 dark:bg-neutral-700/50 border-l border-neutral-300 dark:border-neutral-600" style={{ width: MARGIN_PRESETS[margins].px }} />
              
              {/* Centimeter Ticks */}
              <div className="absolute inset-0 flex justify-between pointer-events-none px-[2px]">
                {Array.from({ length: 22 }).map((_, cm) => (
                  <div key={cm} className="flex flex-col items-center justify-end h-full relative" style={{ width: cm === 21 ? '0px' : 'calc(100% / 21)' }}>
                    {/* Tick line */}
                    <div className={`w-px ${cm % 5 === 0 ? 'h-3 bg-neutral-400 dark:bg-neutral-500' : 'h-1.5 bg-neutral-300 dark:bg-neutral-600'}`} />
                    {/* Cm Label */}
                    {cm > 0 && cm < 21 && (cm % 2 === 0 || cm === 1 || cm === 19) && (
                      <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 absolute bottom-3">
                        {cm}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Page Breaks */}
          {showGuides && Array.from({ length: Math.max(0, pages - 1) }).map((_, i) => (
            <div 
              key={i} 
              className="absolute left-0 w-full border-t-2 border-dashed border-blue-400 z-10 flex items-center justify-center pointer-events-none print:hidden"
              style={{ top: `calc(29.7cm * ${i + 1})` }}
            >
              <span className="bg-blue-400 text-white text-[10px] px-3 py-1 rounded-full -translate-y-1/2 shadow-sm font-bold tracking-widest uppercase">
                Fim da Página {i + 1}
              </span>
            </div>
          ))}

          <table className="w-full h-full border-collapse">
            <thead className="print:table-header-group w-full">
              <tr>
                <td className="w-full p-0">
                  <div className="w-full relative group">
                    {showGuides && (
                      <div className="absolute -left-32 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 print:hidden pointer-events-none">
                        Cabeçalho <div className="w-8 h-px bg-neutral-200"></div>
                      </div>
                    )}
                    <UncontrolledEditable
                      innerRef={headerRef}
                      className={`pt-16 pb-6 outline-none prose prose-neutral max-w-none text-neutral-900 prose-p:m-0 prose-headings:m-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0 min-h-[120px] transition-colors print:hover:bg-transparent print:border-none focus:bg-neutral-50/50 select-text pointer-events-auto ${
                        showGuides 
                          ? 'hover:bg-neutral-50/50 border-b border-dashed border-transparent hover:border-neutral-200 focus:border-neutral-200' 
                          : 'border-b border-transparent'
                      }`}
                      style={{ paddingLeft: MARGIN_PRESETS[margins].px, paddingRight: MARGIN_PRESETS[margins].px }}
                      onFocus={() => setActiveRegion('header')}
                      onBlur={(e: any) => setHeader(e.currentTarget.innerHTML)}
                      onInput={markDirty}
                      onKeyDown={handleKeyDown}
                      onContextMenu={handleContextMenu}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      initialHtml={initialHeader.current}
                    />
                  </div>
                </td>
              </tr>
            </thead>
            
            <tbody className="w-full">
              <tr>
                <td className="w-full p-0 align-top h-full">
                  <div className="flex-1 w-full relative group h-full">
                    {showGuides && (
                      <div className="absolute -left-32 top-12 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 print:hidden pointer-events-none">
                        Corpo do Texto <div className="w-4 h-px bg-neutral-200"></div>
                      </div>
                    )}
                    <UncontrolledEditable
                      innerRef={bodyRef}
                      className={`py-8 outline-none prose prose-neutral max-w-none text-neutral-900 text-justify prose-p:m-0 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 h-full min-h-[500px] select-text pointer-events-auto ${
                        showGuides ? 'hover:bg-neutral-50/50 focus:bg-neutral-50/50' : ''
                      }`}
                      style={{ fontFamily: 'Times New Roman, serif', fontSize: '12pt', lineHeight: '1.5', paddingLeft: MARGIN_PRESETS[margins].px, paddingRight: MARGIN_PRESETS[margins].px }}
                      onFocus={() => setActiveRegion('body')}
                      onBlur={(e: any) => setContent(e.currentTarget.innerHTML)}
                      onInput={markDirty}
                      onKeyDown={handleKeyDown}
                      onContextMenu={handleContextMenu}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      initialHtml={initialContent.current}
                    />
                  </div>
                </td>
              </tr>
            </tbody>

            <tfoot className="print:table-footer-group w-full">
              <tr>
                <td className="w-full p-0">
                  <div className="w-full relative group mt-auto">
                    {showGuides && (
                      <div className="absolute -left-32 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 print:hidden pointer-events-none">
                        Rodapé <div className="w-8 h-px bg-neutral-200"></div>
                      </div>
                    )}
                    <UncontrolledEditable
                      innerRef={footerRef}
                      className={`pt-6 pb-12 outline-none prose prose-neutral max-w-none text-neutral-900 prose-p:m-0 prose-headings:m-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0 min-h-[100px] transition-colors print:hover:bg-transparent print:border-none focus:bg-neutral-50/50 text-center text-xs ${
                        showGuides 
                          ? 'hover:bg-neutral-50/50 border-t border-dashed border-transparent hover:border-neutral-200 focus:border-neutral-200' 
                          : 'border-t border-transparent'
                      }`}
                      style={{ paddingLeft: MARGIN_PRESETS[margins].px, paddingRight: MARGIN_PRESETS[margins].px }}
                      onFocus={() => setActiveRegion('footer')}
                      onBlur={(e: any) => setFooter(e.currentTarget.innerHTML)}
                      onInput={markDirty}
                      onKeyDown={handleKeyDown}
                      onContextMenu={handleContextMenu}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      initialHtml={initialFooter.current}
                    />
                    <div className="print-page-number" />
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

        </div>
      </div>
      
      {/* Custom Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl py-2 w-52 text-sm text-neutral-700 dark:text-neutral-300 print:hidden overflow-hidden"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 350), left: Math.min(contextMenu.x, window.innerWidth - 220) }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('copy'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><Copy size={16}/> Copiar</span><span className="text-[10px] text-neutral-400">Ctrl+C</span></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('cut'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><Scissors size={16}/> Recortar</span><span className="text-[10px] text-neutral-400">Ctrl+X</span></button>
          <button onMouseDown={e => e.preventDefault()} onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              execCmd('insertText', text);
            } catch (err) {
              showToast('Seu navegador bloqueia a colagem automática. Use Ctrl+V.', 'warning');
            }
            setContextMenu(null);
          }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><ClipboardPaste size={16}/> Colar</span><span className="text-[10px] text-neutral-400">Ctrl+V</span></button>
          <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 my-1" />
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('bold'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><Bold size={16}/> Negrito</span><span className="text-[10px] text-neutral-400">Ctrl+N</span></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('italic'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><Italic size={16}/> Itálico</span><span className="text-[10px] text-neutral-400">Ctrl+I</span></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('underline'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><Underline size={16}/> Sublinhado</span><span className="text-[10px] text-neutral-400">Ctrl+U</span></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => {
            const url = window.prompt('Digite a URL do link:');
            if (url) {
              const sel = window.getSelection();
              if (sel && savedSelectionRef.current) {
                sel.removeAllRanges();
                sel.addRange(savedSelectionRef.current);
              }
              execCmd('createLink', url);
            }
            setContextMenu(null);
          }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between">
            <span className="flex items-center gap-3"><LinkIcon size={16}/> Inserir Link</span>
            <span className="text-[10px] text-neutral-400">Ctrl+K</span>
          </button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('selectAll'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between">
            <span className="flex items-center gap-3"><FileText size={16}/> Selecionar Tudo</span>
            <span className="text-[10px] text-neutral-400">Ctrl+A</span>
          </button>
          <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 my-1" />
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('justifyLeft'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><AlignLeft size={16}/> Esquerda</span><span className="text-[10px] text-neutral-400">Ctrl+Q</span></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('justifyCenter'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><AlignCenter size={16}/> Centralizar</span><span className="text-[10px] text-neutral-400">Ctrl+E</span></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => { execCmd('justifyFull'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"><span className="flex items-center gap-3"><AlignJustify size={16}/> Justificar</span><span className="text-[10px] text-neutral-400">Ctrl+J</span></button>
          <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800 my-1" />
          <button onMouseDown={e => e.preventDefault()} onClick={() => { setContextMenu(null); handleOpenSpacingMenu(); }} className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-3"><ArrowUpDown size={16}/> Espaçamento</button>
        </div>
      )}

      <ConfirmModal isOpen={!!confirmConfig} onCancel={() => setConfirmConfig(null)} {...confirmConfig} />
    </motion.div>
  );
};

// -------------------------------------------------------------
// MAIN MODULE COMPONENT
// -------------------------------------------------------------
const TemplatesModule = ({ currentUser, currentInstitution }: { currentUser?: AdminUser | null, currentInstitution?: Institution | null }) => {
  const [activeTab, setActiveTab] = React.useState<'Oficiais' | 'Meus'>('Meus');
  const [search, setSearch] = React.useState('');
  
  // Oficiais State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState<DocumentTemplate[]>(MOCK_TEMPLATES);
  const [formData, setFormData] = React.useState<Partial<DocumentTemplate>>({
    title: '', description: '', category: 'Geral', format: 'Word', fileUrl: ''
  });
  const [confirmConfig, setConfirmConfig] = React.useState<any>(null);

  // Meus Documentos State
  const [webDocs, setWebDocs] = React.useState<WebDocument[]>(() => {
    const saved = localStorage.getItem('@gestao360:web_documents');
    return saved ? JSON.parse(saved) : [];
  });
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingWebDoc, setEditingWebDoc] = React.useState<WebDocument | undefined>(undefined);
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);

  // Save Web Docs to LocalStorage
  React.useEffect(() => {
    localStorage.setItem('@gestao360:web_documents', JSON.stringify(webDocs));
  }, [webDocs]);


  // -----------------------------------
  // OFICIAIS LOGIC
  // -----------------------------------
  const handleEdit = (template: DocumentTemplate) => {
    setFormData(template);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      title: 'Excluir modelo?',
      message: 'Esta ação não pode ser desfeita. O modelo oficial será removido de forma permanente.',
      confirmText: 'Excluir',
      isDestructive: true,
      onConfirm: () => {
        setTemplates(templates.filter(t => t.id !== id));
        showToast('Modelo excluído.', 'success');
        setConfirmConfig(null);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = formData.id || Math.random().toString(36).substr(2, 9);
    const newTemplate = { ...formData, id: newId, updatedAt: new Date().toISOString() } as DocumentTemplate;

    if (formData.id) {
      setTemplates(templates.map(t => t.id === formData.id ? newTemplate : t));
      showToast('Modelo atualizado com sucesso.');
    } else {
      setTemplates([newTemplate, ...templates]);
      showToast('Modelo adicionado com sucesso.');
    }
    
    setIsModalOpen(false);
    
    // Auto-open the editor if creating a new Web Template
    if (formData.format === 'Editor Web' && !formData.id) {
      setEditingTemplateId(newId);
      setEditingWebDoc({
        id: newId,
        title: formData.title || '',
        content: '<p><br></p>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'Rascunho'
      });
      setIsEditorOpen(true);
    }

    setFormData({ title: '', description: '', category: 'Geral', format: 'Word', fileUrl: '' });
  };

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'Word': return <FileText size={32} className="text-blue-500" />;
      case 'Excel': return <FileText size={32} className="text-emerald-500" />;
      case 'PDF': return <FileText size={32} className="text-rose-500" />;
      case 'PowerPoint': return <FileText size={32} className="text-orange-500" />;
      case 'Editor Web': return <FileBadge size={32} className="text-sky-500" />;
      default: return <FileText size={32} className="text-neutral-500" />;
    }
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'Word': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      case 'Excel': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
      case 'PDF': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
      case 'PowerPoint': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
      case 'Editor Web': return 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 border-sky-200 dark:border-sky-500/30';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
    }
  };

  const handleDownload = (template: DocumentTemplate) => {
    if (String(template.format) === 'Editor Web') {
      // Create new document from this template
      setEditingWebDoc({
        id: '',
        title: `Novo - ${template.title}`,
        header: (template as any).header || '<p><br></p>',
        content: (template as any).content || '<p><br></p>',
        footer: (template as any).footer || '<p><br></p>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'Rascunho'
      });
      setEditingTemplateId(null);
      setIsEditorOpen(true);
      return;
    }

    if (template.fileUrl && template.fileUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = template.fileUrl;
      let ext = '.pdf';
      if (template.format === 'Word') ext = '.docx';
      else if (template.format === 'Excel') ext = '.xlsx';
      else if (template.format === 'PowerPoint') ext = '.pptx';
      a.download = `${template.title}${ext}`;
      a.click();
    } else if (template.fileUrl) {
      window.open(template.fileUrl, '_blank');
    }
  };


  // -----------------------------------
  // MEUS DOCUMENTOS LOGIC
  // -----------------------------------
  const handleSaveWebDoc = (doc: WebDocument, silent?: boolean) => {
    if (editingTemplateId) {
      // We are editing a template's base content
      setTemplates(templates.map(t => t.id === editingTemplateId ? { ...t, content: doc.content, header: doc.header, footer: doc.footer } as DocumentTemplate : t));
      if (!silent) {
        setIsEditorOpen(false);
        setEditingTemplateId(null);
        showToast('Conteúdo do modelo oficial atualizado!', 'success');
      }
      return;
    }

    setWebDocs(prev => {
      const exists = prev.find(d => d.id === doc.id);
      if (exists) return prev.map(d => d.id === doc.id ? doc : d);
      return [doc, ...prev];
    });
    
    if (!silent) {
      setIsEditorOpen(false);
      showToast(`Documento ${doc.status} salvo com sucesso!`, 'success');
    }
  };

  const handleDeleteWebDoc = (id: string) => {
    setConfirmConfig({
      title: 'Excluir documento?',
      message: 'Esta ação não pode ser desfeita. O documento será removido permanentemente.',
      confirmText: 'Excluir',
      isDestructive: true,
      onConfirm: () => {
        setWebDocs(webDocs.filter(d => d.id !== id));
        showToast('Documento excluído.');
        setConfirmConfig(null);
      }
    });
  };

  const filteredWebDocs = webDocs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  if (isEditorOpen) {
    return (
      <div className="animate-in fade-in duration-500 pb-20">
        <DocumentEditor 
          doc={editingWebDoc} 
          onClose={() => { setIsEditorOpen(false); setEditingTemplateId(null); }}
          onSave={handleSaveWebDoc}
          currentUser={currentUser}
          currentInstitution={currentInstitution}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl">
              <FileBadge size={32} className="text-neutral-900 dark:text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Editor & Modelos</h2>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Produza seus documentos ou acesse os modelos oficiais.</p>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-4">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar documentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 pl-12 pr-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
              />
            </div>
            {activeTab === 'Oficiais' ? (
              <button 
                onClick={() => {
                  setFormData({ title: '', description: '', category: 'Geral', format: 'Word', fileUrl: '' });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white px-6 py-3 rounded-2xl font-bold text-sm hover:scale-105 transition-all shrink-0"
              >
                <Plus size={18} /> <span className="hidden sm:inline">Novo Modelo</span>
              </button>
            ) : (
              <button 
                onClick={() => { setEditingWebDoc(undefined); setEditingTemplateId(null); setIsEditorOpen(true); }}
                className="flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-neutral-900/10 dark:shadow-white/10 shrink-0"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Novo Documento</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex px-8 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button 
            onClick={() => setActiveTab('Meus')}
            className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'Meus' ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white' : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
          >
            Meus Documentos (Editor)
          </button>
          <button 
            onClick={() => setActiveTab('Oficiais')}
            className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'Oficiais' ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white' : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
          >
            Modelos Oficiais (Anexos)
          </button>
        </div>
      </div>

      {/* OFICIAIS TAB */}
      {activeTab === 'Oficiais' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-neutral-200 dark:hover:border-neutral-700 transition-all group flex flex-col h-full cursor-pointer" onClick={() => handleDownload(template)}>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  {getFormatIcon(template.format)}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${getFormatBadge(template.format)}`}>
                    {template.format}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(template); }} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-sky-500 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-rose-500 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 line-clamp-2">{template.title}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 line-clamp-3 flex-1">{template.description}</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{template.category}</span>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <Clock size={12} />
                  <span>{new Date(template.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MEUS DOCUMENTOS TAB */}
      {activeTab === 'Meus' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {filteredWebDocs.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-neutral-400 mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Nenhum documento criado</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">Clique em "Novo Documento" para iniciar o editor.</p>
            </div>
          ) : (
            filteredWebDocs.map(doc => (
              <div key={doc.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${doc.status === 'Rascunho' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-500'}`}>
                    {doc.status}
                  </span>
                  <button onClick={() => handleDeleteWebDoc(doc.id)} className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 line-clamp-2">{doc.title}</h3>
                
                {/* Preview text stripped from HTML */}
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 line-clamp-3 flex-1 italic border-l-2 border-neutral-200 dark:border-neutral-700 pl-3">
                  {doc.content.replace(/<[^>]*>?/gm, '') || "Sem conteúdo"}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Atualizado em {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                  <button 
                    onClick={() => { setEditingWebDoc(doc); setEditingTemplateId(null); setIsEditorOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    <Edit2 size={14} /> Abrir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-[2rem] p-8 max-w-xl w-full shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{formData.id ? 'Editar Modelo' : 'Novo Modelo'}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{formData.id ? 'Atualize as informações do modelo de documento.' : 'Adicione um novo documento padrão à biblioteca.'}</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Título do Modelo</label>
                  <input 
                    required type="text" placeholder="Ex: Ofício de Resposta Padrão" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Descrição Breve</label>
                  <textarea 
                    required rows={3} placeholder="Descreva quando e como este modelo deve ser usado..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Categoria</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all">
                      <option value="Geral">Geral</option><option value="RH">RH</option><option value="Licitações">Licitações</option><option value="Contratos">Contratos</option><option value="Ofícios">Ofícios</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Formato</label>
                    <select value={formData.format} onChange={e => setFormData({...formData, format: e.target.value as any})} className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all">
                      <option value="Word">Word</option><option value="Excel">Excel</option><option value="PDF">PDF</option><option value="PowerPoint">PowerPoint</option><option value="Editor Web">Editor Web (Doc Nativo)</option><option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                {formData.format === 'Editor Web' && formData.id ? (
                  <div className="pt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingTemplateId(formData.id!);
                        setEditingWebDoc({
                          id: formData.id!,
                          title: formData.title || '',
                          header: (formData as any).header || '<p><br></p>',
                          content: (formData as any).content || '<p><br></p>',
                          footer: (formData as any).footer || '<p><br></p>',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          status: 'Rascunho'
                        });
                        setIsModalOpen(false);
                        setIsEditorOpen(true);
                      }}
                      className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all border border-dashed border-sky-200 dark:border-sky-500/30"
                    >
                      <Edit2 size={16} className="inline mr-2 -mt-0.5" /> Editar Conteúdo do Modelo
                    </button>
                    <p className="text-center text-[10px] font-bold text-neutral-400 mt-2">Você poderá escrever o conteúdo base no editor.</p>
                  </div>
                ) : formData.format !== 'Editor Web' ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Upload do Arquivo {formData.id ? '(Opcional)' : ''}</label>
                    <input 
                      required={!formData.id}
                      type="file"
                      accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({...formData, fileUrl: reader.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 dark:file:bg-white dark:file:text-neutral-900 dark:hover:file:bg-neutral-100 cursor-pointer"
                    />
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-center uppercase tracking-widest">
                    Após adicionar, o Editor abrirá automaticamente para você colar o seu texto.
                  </p>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 hover:scale-105 transition-all">
                    {formData.id ? 'Salvar Alterações' : 'Adicionar Modelo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={!!confirmConfig} onCancel={() => setConfirmConfig(null)} {...confirmConfig} />
    </div>
  );
};

export { TemplatesModule };
