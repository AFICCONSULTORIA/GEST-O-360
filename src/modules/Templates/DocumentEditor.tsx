import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { WebDocument, TimbreData, WatermarkConfig, MarginPreset } from './types';
import { AdminUser, Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';
import { TimbreModal } from './TimbreModal';
import { 
  createDefaultTimbreData, generateHeaderHtml, generateFooterHtml, 
  MARGIN_PRESETS, getWatermarkStyles, getWatermarkText 
} from './timbrePresets';

const { 
  Plus, Search: SearchIcon, Edit2, Trash2, FileText, Download, Clock, FileBadge, X, ChevronLeft,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Heading1, Heading2, Heading3, Printer, Save, Send, Undo, Redo, Indent, Outdent,
  TableProperties, ArrowUpDown, Minus, Image: ImageIcon, Scissors, Copy, ClipboardPaste,
  Type, Highlighter, Palette, Check, Replace, ZoomIn, ZoomOut, Maximize2, Minimize2,
  ChevronDown, ChevronUp, XCircle, LayoutTemplate, Link: LinkIcon, Wand2, PenTool, Workflow,
  Shield, Calendar, Sparkles, HelpCircle, Columns
} = LucideIcons;

const FONT_FAMILIES = [
  'Times New Roman', 'Arial', 'Inter', 'Georgia', 'Courier New', 'Verdana', 'Trebuchet MS', 'Tahoma'
];

const FONT_SIZES = ['8', '9', '10', '11', '12', '13', '14', '16', '18', '20', '22', '24', '28', '36', '48'];

const PRESET_COLORS = [
  '#000000', '#1f2937', '#4b5563', '#6b7280', '#9ca3af', '#cbd5e1', '#ffffff',
  '#b91c1c', '#dc2626', '#ea580c', '#d97706', '#15803d', '#0284c7', '#1d4ed8',
  '#4338ca', '#6d28d9', '#be185d', '#0f766e', '#fde047', '#fed7aa', '#bbf7d0'
];

// -------------------------------------------------------------
// CONFIRM MODAL
// -------------------------------------------------------------
const ConfirmModal = ({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', isDestructive = false, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
// UNCONTROLLED EDITABLE
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
// DOCUMENT EDITOR COMPONENT
// -------------------------------------------------------------
export const DocumentEditor = ({ 
  doc, 
  onClose, 
  onSave, 
  currentUser, 
  currentInstitution 
}: { 
  doc?: WebDocument, 
  onClose: () => void, 
  onSave: (d: WebDocument, silent?: boolean) => void, 
  currentUser?: AdminUser | null, 
  currentInstitution?: Institution | null 
}) => {
  const DEFAULT_CONTENT = '<p style="font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.5;"><br></p>';

  // Base Timbre Resolution
  const initialTimbre = React.useMemo(() => {
    if (doc?.timbreConfig) return doc.timbreConfig;
    const saved = localStorage.getItem('@gestao360:timbre_config');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return createDefaultTimbreData(currentInstitution);
  }, [doc, currentInstitution]);

  const [title, setTitle] = React.useState(doc?.title || 'Novo Documento Oficial');
  const [header, setHeader] = React.useState(doc?.header || generateHeaderHtml(initialTimbre));
  const [content, setContent] = React.useState(doc?.content || DEFAULT_CONTENT);
  const [footer, setFooter] = React.useState(doc?.footer || generateFooterHtml(initialTimbre));
  
  const [timbreConfig, setTimbreConfig] = React.useState<TimbreData>(initialTimbre);
  const [isTimbreActive, setIsTimbreActive] = React.useState(doc?.timbreConfig ? doc.timbreConfig.style !== 'nenhum' : true);
  const [watermarkConfig, setWatermarkConfig] = React.useState<WatermarkConfig>(
    doc?.watermarkConfig || { type: 'none', opacity: 0.1 }
  );

  const [isTimbreModalOpen, setIsTimbreModalOpen] = React.useState(false);
  const [isFocusMode, setIsFocusMode] = React.useState(false);
  const [isSpacingMenuOpen, setIsSpacingMenuOpen] = React.useState(false);
  const [isStylesMenuOpen, setIsStylesMenuOpen] = React.useState(false);
  const [isInsertMenuOpen, setIsInsertMenuOpen] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number } | null>(null);
  const [activeRegion, setActiveRegion] = React.useState<'header'|'body'|'footer'>('body');
  const [pages, setPages] = React.useState(1);
  const [confirmConfig, setConfirmConfig] = React.useState<any>(null);

  const initialHeader = React.useRef(doc?.header || generateHeaderHtml(initialTimbre));
  const initialContent = React.useRef(doc?.content || DEFAULT_CONTENT);
  const initialFooter = React.useRef(doc?.footer || generateFooterHtml(initialTimbre));

  // Typography & Colors
  const [selectedFont, setSelectedFont] = React.useState('Times New Roman');
  const [selectedSize, setSelectedSize] = React.useState('12');
  const [showTextColorPicker, setShowTextColorPicker] = React.useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = React.useState(false);
  const [textColor, setTextColor] = React.useState('#000000');
  const [highlightColor, setHighlightColor] = React.useState('#FFFF00');
  const [activeFormats, setActiveFormats] = React.useState<Record<string, boolean>>({});
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);
  const isDirtyRef = React.useRef(false);

  // Zoom, Guides & Search
  const [zoom, setZoom] = React.useState(100);
  const [showFindReplace, setShowFindReplace] = React.useState(false);
  const [findText, setFindText] = React.useState('');
  const [replaceText, setReplaceText] = React.useState('');
  const [findCount, setFindCount] = React.useState(0);
  const [showTableGrid, setShowTableGrid] = React.useState(false);
  const [tableGridHover, setTableGridHover] = React.useState({ rows: 0, cols: 0 });
  const [showMarginsMenu, setShowMarginsMenu] = React.useState(false);
  const [margins, setMargins] = React.useState<MarginPreset>(doc?.margins || 'abnt');
  const [showGuides, setShowGuides] = React.useState(true);
  const [showSmartVars, setShowSmartVars] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const savedSelectionRef = React.useRef<Range | null>(null);

  const markDirty = () => { isDirtyRef.current = true; };

  const getActiveRef = () => {
    if (activeRegion === 'header') return headerRef;
    if (activeRegion === 'footer') return footerRef;
    return bodyRef;
  };

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    markDirty();
  };

  // ---- Aplicação do Timbre ----
  const handleApplyTimbre = (newTimbre: TimbreData, newWatermark?: WatermarkConfig) => {
    setTimbreConfig(newTimbre);
    if (newWatermark) setWatermarkConfig(newWatermark);
    setIsTimbreActive(newTimbre.style !== 'nenhum');

    const newHeaderHtml = generateHeaderHtml(newTimbre);
    const newFooterHtml = generateFooterHtml(newTimbre);

    if (headerRef.current) headerRef.current.innerHTML = newHeaderHtml;
    if (footerRef.current) footerRef.current.innerHTML = newFooterHtml;

    setHeader(newHeaderHtml);
    setFooter(newFooterHtml);
    markDirty();
  };

  // Toggle Timbre ON / OFF
  const toggleTimbre = () => {
    if (isTimbreActive) {
      setIsTimbreActive(false);
      const emptyHeader = '<p><br></p>';
      const emptyFooter = '<p><br></p>';
      if (headerRef.current) headerRef.current.innerHTML = emptyHeader;
      if (footerRef.current) footerRef.current.innerHTML = emptyFooter;
      setHeader(emptyHeader);
      setFooter(emptyFooter);
      showToast('Timbre desativado (folha limpa)', 'info');
    } else {
      setIsTimbreActive(true);
      const newHeaderHtml = generateHeaderHtml(timbreConfig);
      const newFooterHtml = generateFooterHtml(timbreConfig);
      if (headerRef.current) headerRef.current.innerHTML = newHeaderHtml;
      if (footerRef.current) footerRef.current.innerHTML = newFooterHtml;
      setHeader(newHeaderHtml);
      setFooter(newFooterHtml);
      showToast('Timbre e papel timbrado ativados!', 'success');
    }
    markDirty();
  };

  // ---- Inserção de Brasão no Cursor ----
  const insertBrasaoAtCursor = () => {
    const brasaoSrc = timbreConfig.logoUrl || currentInstitution?.logo_url;
    if (!brasaoSrc) {
      showToast('Nenhum brasão configurado. Abra "Timbre & Papel Timbrado" para carregar.', 'warning');
      return;
    }
    const html = `<div style="text-align: center; margin: 12px 0;"><img src="${brasaoSrc}" style="height: 60px; max-width: 90px; object-fit: contain; display: inline-block;" alt="Brasão Oficial" /></div><p><br></p>`;
    execCmd('insertHTML', html);
    showToast('Brasão oficial inserido no cursor.', 'success');
  };

  // ---- Inserção de Data Atual por Extenso ----
  const insertCurrentDate = () => {
    const muni = timbreConfig.municipio || currentInstitution?.name || 'Município';
    const dateFormatted = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = `${muni}, ${dateFormatted}.`;
    execCmd('insertHTML', text);
    showToast('Data atual inserida!', 'success');
  };

  // ---- Inserção de Estilos ABNT / Redação Oficial ----
  const applyOfficialStyle = (styleType: 'paragrafo_abnt' | 'ementa' | 'artigo' | 'citacao' | 'fecho_respeitosamente' | 'fecho_atenciosamente') => {
    switch (styleType) {
      case 'paragrafo_abnt': {
        const html = `<p style="text-align: justify; text-indent: 2.5cm; line-height: 1.5; margin-bottom: 12px; font-family: 'Times New Roman', serif; font-size: 12pt;">Digite aqui o parágrafo oficial com recuo padrão de 2,5cm...</p>`;
        execCmd('insertHTML', html);
        break;
      }
      case 'ementa': {
        const html = `<div style="margin-left: 45%; margin-bottom: 20px; text-align: justify; font-size: 10.5pt; font-style: italic; line-height: 1.35; font-family: 'Times New Roman', serif;">"Ementa oficial: sintetiza o objeto da norma ou ato administrativo..."</div><p><br></p>`;
        execCmd('insertHTML', html);
        break;
      }
      case 'artigo': {
        const html = `<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 10px; line-height: 1.5; font-family: 'Times New Roman', serif; font-size: 12pt;"><b>Art. 1º</b> [Texto do artigo dispositivo]...</p>`;
        execCmd('insertHTML', html);
        break;
      }
      case 'citacao': {
        const html = `<div style="margin-left: 4cm; font-size: 10pt; line-height: 1.2; text-align: justify; margin-bottom: 14px; color: #222; font-family: 'Times New Roman', serif; border-left: 2px solid #94a3b8; padding-left: 10px;">"Citação direta longa com mais de 3 linhas conforme normas da ABNT..."</div><p><br></p>`;
        execCmd('insertHTML', html);
        break;
      }
      case 'fecho_respeitosamente': {
        const html = `<p style="margin-top: 24px; margin-bottom: 30px; font-family: 'Times New Roman', serif; font-size: 12pt;">Respeitosamente,</p>`;
        execCmd('insertHTML', html);
        break;
      }
      case 'fecho_atenciosamente': {
        const html = `<p style="margin-top: 24px; margin-bottom: 30px; font-family: 'Times New Roman', serif; font-size: 12pt;">Atenciosamente,</p>`;
        execCmd('insertHTML', html);
        break;
      }
    }
    setIsStylesMenuOpen(false);
    showToast('Estilo aplicado!', 'success');
  };

  // ---- Inserção de Blocos de Assinatura ----
  const insertSignatureBlock = (type: 'simples' | 'dupla' | 'trio' | 'digital') => {
    const userName = currentUser?.name || 'Nome do Responsável';
    const userRole = currentUser?.role || 'Cargo Oficial';
    const deptName = timbreConfig.secretaria || currentInstitution?.name || 'Prefeitura Municipal';

    let html = '';
    if (type === 'simples') {
      html = `<div style="text-align: center; margin-top: 45px; page-break-inside: avoid;" data-signature-block="true">
        <div style="width: 280px; border-top: 1px solid #000; margin: 0 auto 8px auto;"></div>
        <p style="margin: 0; font-weight: bold; font-size: 11pt;">${userName}</p>
        <p style="margin: 0; font-size: 10pt; color: #333;">${userRole}</p>
        <p style="margin: 0; font-size: 9pt; color: #666;">${deptName}</p>
      </div><p><br></p>`;
    } else if (type === 'dupla') {
      html = `<div style="display: flex; justify-content: space-around; margin-top: 45px; page-break-inside: avoid;" data-signature-block="true">
        <div style="text-align: center; width: 45%;">
          <div style="border-top: 1px solid #000; margin-bottom: 6px;"></div>
          <p style="margin: 0; font-weight: bold; font-size: 10.5pt;">${userName}</p>
          <p style="margin: 0; font-size: 9.5pt; color: #333;">${userRole}</p>
        </div>
        <div style="text-align: center; width: 45%;">
          <div style="border-top: 1px solid #000; margin-bottom: 6px;"></div>
          <p style="margin: 0; font-weight: bold; font-size: 10.5pt;">[Nome do 2º Signatário]</p>
          <p style="margin: 0; font-size: 9.5pt; color: #333;">[Cargo / Função]</p>
        </div>
      </div><p><br></p>`;
    } else if (type === 'trio') {
      html = `<div style="display: flex; flex-wrap: wrap; justify-content: space-around; gap: 24px; margin-top: 45px; page-break-inside: avoid;" data-signature-block="true">
        <div style="text-align: center; width: 42%;">
          <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">${userName}</p>
          <p style="margin: 0; font-size: 9pt; color: #444;">Presidente da Comissão</p>
        </div>
        <div style="text-align: center; width: 42%;">
          <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">[Membro 1]</p>
          <p style="margin: 0; font-size: 9pt; color: #444;">Secretário(a)</p>
        </div>
        <div style="text-align: center; width: 42%;">
          <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">[Membro 2]</p>
          <p style="margin: 0; font-size: 9pt; color: #444;">Membro Vogal</p>
        </div>
      </div><p><br></p>`;
    } else if (type === 'digital') {
      const authCode = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      const qrCodeSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="70" height="70"><rect width="100" height="100" fill="white"/><rect x="10" y="10" width="25" height="25" fill="black"/><rect x="15" y="15" width="15" height="15" fill="white"/><rect x="18" y="18" width="9" height="9" fill="black"/><rect x="65" y="10" width="25" height="25" fill="black"/><rect x="70" y="15" width="15" height="15" fill="white"/><rect x="73" y="18" width="9" height="9" fill="black"/><rect x="10" y="65" width="25" height="25" fill="black"/><rect x="15" y="70" width="15" height="15" fill="white"/><rect x="18" y="73" width="9" height="9" fill="black"/><rect x="45" y="45" width="10" height="10" fill="black"/><rect x="65" y="65" width="20" height="10" fill="black"/><rect x="45" y="65" width="10" height="25" fill="black"/><rect x="65" y="80" width="25" height="10" fill="black"/></svg>`;

      html = `<div style="border: 1.5px solid #0284c7; background-color: #f0f9ff; border-radius: 8px; padding: 12px 16px; margin: 35px 0 20px 0; font-family: Inter, sans-serif; page-break-inside: avoid;" data-signature-block="true">
        <table style="width: 100%; border: none; border-collapse: collapse;">
          <tr>
            <td style="width: 80px; vertical-align: middle; border: none; padding: 0 12px 0 0;">
              <img src="${qrCodeSvg}" alt="QR Autenticidade" style="width: 68px; height: 68px; display: block;" />
            </td>
            <td style="vertical-align: middle; border: none; padding: 0;">
              <p style="margin: 0; font-size: 10pt; font-weight: bold; color: #0369a1;">DOCUMENTO ASSINADO DIGITALMENTE NO GESTÃO 360</p>
              <p style="margin: 2px 0; font-size: 9pt; color: #334155;"><b>Signatário:</b> ${userName} (${userRole})</p>
              <p style="margin: 2px 0; font-size: 8pt; color: #64748b;"><b>Data/Hora:</b> ${new Date().toLocaleString('pt-BR')} &nbsp;|&nbsp; <b>Cód. Autenticação:</b> <span style="font-family: monospace; font-weight: bold; color: #0284c7;">${authCode}</span></p>
              <p style="margin: 2px 0 0 0; font-size: 7.5pt; color: #94a3b8;">A autenticidade pode ser conferida no portal oficial de validação de documentos.</p>
            </td>
          </tr>
        </table>
      </div><p><br></p>`;
    }

    execCmd('insertHTML', html);
    setIsInsertMenuOpen(false);
    showToast('Bloco de assinatura inserido!', 'success');
  };

  // ---- Inserção de Caixa de Destaque ----
  const insertCalloutBox = (type: 'info' | 'aviso' | 'nota') => {
    let borderColor = '#0284c7';
    let bgColor = '#f0f9ff';
    let title = 'ℹ️ INFORMAÇÃO OFICIAL';

    if (type === 'aviso') {
      borderColor = '#f59e0b';
      bgColor = '#fffbeb';
      title = '⚠️ AVISO IMPORTANTE';
    } else if (type === 'nota') {
      borderColor = '#10b981';
      bgColor = '#f0fdf4';
      title = '📌 NOTA EXPLICATIVA';
    }

    const html = `<div style="border-left: 4px solid ${borderColor}; background-color: ${bgColor}; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; font-family: Inter, sans-serif;">
      <p style="margin: 0 0 4px 0; font-weight: bold; font-size: 9.5pt; color: #1e293b;">${title}</p>
      <p style="margin: 0; font-size: 10pt; color: #334155;">Digite aqui o conteúdo de destaque...</p>
    </div><p><br></p>`;

    execCmd('insertHTML', html);
    setIsInsertMenuOpen(false);
    showToast('Caixa de destaque inserida!', 'success');
  };

  // ---- Inserção de Quebra de Página Oficial ----
  const insertPageBreak = () => {
    const html = `<div style="page-break-before: always; border-top: 2px dashed #93c5fd; margin: 30px 0; padding-top: 10px; text-align: center; color: #3b82f6; font-size: 9pt; font-weight: bold; font-family: Inter, sans-serif;" class="print-page-break" data-page-break="true">
      <span class="print:hidden">✂️ --- QUEBRA DE PÁGINA OFICIAL ---</span>
    </div><p><br></p>`;
    execCmd('insertHTML', html);
    setIsInsertMenuOpen(false);
    showToast('Quebra de página inserida!', 'success');
  };

  // ---- Variáveis Inteligentes ----
  const insertSmartVar = (variableName: string) => {
    const varHtml = `<span style="background-color: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; padding: 2px 5px; border-radius: 4px; font-weight: bold; font-family: Inter, sans-serif; font-size: 10px;" data-smart-var="true">{{${variableName}}}</span>&nbsp;`;
    execCmd('insertHTML', varHtml);
    setShowSmartVars(false);
  };

  const replaceSmartVars = () => {
    let currentHtml = bodyRef.current?.innerHTML || '';
    const dateExtenso = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateCurta = new Date().toLocaleDateString('pt-BR');
    const docNum = '00' + Math.floor(Math.random() * 900 + 100);

    const vars: Record<string, string> = {
      'NOME_USUARIO': currentUser?.name || '[Nome do Usuário]',
      'CARGO_USUARIO': currentUser?.role || '[Cargo do Usuário]',
      'NOME_MUNICIPIO': timbreConfig.municipio || currentInstitution?.name || '[Nome do Município]',
      'ESTADO': timbreConfig.estado || 'MATO GROSSO',
      'NOME_SECRETARIA': timbreConfig.secretaria || 'Secretaria Municipal',
      'NOME_SECRETARIA_SIGLA': timbreConfig.secretaria?.split(' ').map(w => w[0]).join('').toUpperCase() || 'PM',
      'DATA_CURTA': dateCurta,
      'DATA_EXTENSO': dateExtenso,
      'ANO': new Date().getFullYear().toString(),
      'MES': new Date().toLocaleDateString('pt-BR', { month: 'long' }),
      'NUMERO_DOCUMENTO': docNum,
      'PROTOCOLO': 'PROT-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 89999 + 10000),
      'CNPJ': timbreConfig.cnpj || '00.000.000/0001-00',
      'ASSINATURA': `<div style="text-align: center; margin-top: 45px;"><div style="width: 250px; border-top: 1px solid black; margin: 0 auto 6px auto;"></div><p style="margin:0; font-weight:bold;">${currentUser?.name || '[Nome]'}</p><p style="margin:0; font-size: 10pt;">${currentUser?.role || '[Cargo]'}</p></div>`
    };

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml;
    
    const varSpans = tempDiv.querySelectorAll('span[data-smart-var="true"]');
    varSpans.forEach(span => {
      const text = span.textContent || '';
      const varName = text.replace(/[{}]/g, '').trim();
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
      showToast('Todas as variáveis foram preenchidas com sucesso!', 'success');
    }
  };

  // ---- Drag and Drop de Imagens ----
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
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
          const imgHtml = `<div style="text-align: center; margin: 12px 0;"><img src="${base64}" style="max-height: 160px; object-fit: contain; display: inline-block;" /></div><p><br></p>`;
          execCmd('insertHTML', imgHtml);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // ---- Before Unload Guard ----
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

  // ---- Page Counter & Height Observer ----
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

  // ---- Close Menus on Click Outside ----
  React.useEffect(() => {
    const closeMenu = () => { 
      setContextMenu(null); 
      setShowTextColorPicker(false); 
      setShowHighlightPicker(false);
      setIsSpacingMenuOpen(false);
      setIsStylesMenuOpen(false);
      setIsInsertMenuOpen(false);
      setShowMarginsMenu(false);
      setShowSmartVars(false);
      setShowTableGrid(false);
    };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  // ---- Monitor Active Formats ----
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
      setActiveFormats(newFormats);

      const fn = document.queryCommandValue('fontName');
      if (fn) {
        const parsedFn = fn.replace(/"/g, '');
        setSelectedFont(parsedFn);
      }
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  // ---- Auto-save Every 20s ----
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        handleSave('Rascunho', true);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [title, header, content, footer, timbreConfig, watermarkConfig, margins]);

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
            margin: 3cm 2cm 2cm 3cm;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-header: h1;
            mso-footer: f1;
          }
          div.Section1 { page: WordSection1; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #d4d4d8; padding: 8px; }
        </style>
      </head>
      <body>
        <div class="Section1">
          <div style="mso-element:header" id="h1"><div class="MsoHeader">${headerHtml}</div></div>
          <div>${bodyHtml}</div>
          <div style="mso-element:footer" id="f1"><div class="MsoFooter">${footerHtml}</div></div>
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
      id: doc?.id || Math.random().toString(36).substring(2, 9),
      title,
      header: headerRef.current?.innerHTML || header,
      content: bodyRef.current?.innerHTML || content,
      footer: footerRef.current?.innerHTML || footer,
      timbreConfig: isTimbreActive ? timbreConfig : { ...timbreConfig, style: 'nenhum' },
      watermarkConfig,
      margins,
      createdAt: doc?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status,
      authorName: currentUser?.name,
      authorRole: currentUser?.role
    }, silent);

    isDirtyRef.current = false;
    setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    if (!silent) showToast(`Documento ${status === 'Rascunho' ? 'salvo como rascunho' : 'finalizado'}!`, 'success');
  };

  // ---- Inserir Tabela ----
  const insertTableWithSize = (rows: number, cols: number) => {
    let rowsHtml = '';
    for (let r = 0; r < rows; r++) {
      let cellsHtml = '';
      for (let c = 0; c < cols; c++) {
        const isHeader = r === 0;
        const tag = isHeader ? 'th' : 'td';
        const bg = isHeader ? 'background-color: #f8fafc; font-weight: bold;' : '';
        cellsHtml += `<${tag} style="border: 1px solid #cbd5e1; padding: 0.65rem; ${bg}"><br></${tag}>`;
      }
      rowsHtml += `<tr>${cellsHtml}</tr>`;
    }
    const tableHTML = `<table style="width: 100%; border-collapse: collapse; margin: 1.25rem 0; font-size: 10.5pt;"><tbody>${rowsHtml}</tbody></table><p><br></p>`;
    execCmd('insertHTML', tableHTML);
    setShowTableGrid(false);
  };

  // ---- Localizar e Substituir ----
  const getWordCount = () => {
    const text = bodyRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTime };
  };

  const highlightFinds = () => {
    if (!bodyRef.current || !findText) { setFindCount(0); return; }
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
      const timer = setTimeout(highlightFinds, 250);
      return () => clearTimeout(timer);
    } else {
      clearFindHighlights();
      setFindCount(0);
    }
  }, [findText, showFindReplace]);

  // ---- Inserir Imagem via Input ----
  const handleInsertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const imgHtml = `<div style="text-align: center; margin: 12px 0;"><img src="${base64}" style="max-height: 180px; object-fit: contain; display: inline-block;" /></div><p><br></p>`;
        execCmd('insertHTML', imgHtml);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---- Aplicar Espaçamento de Linha ----
  const applySpacing = (next: string) => {
    execCmd('formatBlock', 'p');
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let el = (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode) as HTMLElement;
      while (el && !['P', 'DIV', 'TD', 'LI', 'H1', 'H2', 'H3'].includes(el.tagName) && el !== bodyRef.current) {
        el = el.parentElement as HTMLElement;
      }
      if (el && el !== bodyRef.current) {
        el.style.lineHeight = next;
        markDirty();
      }
    }
    setIsSpacingMenuOpen(false);
  };

  // ---- Aplicar Fonte e Tamanho ----
  const applyFontFamily = (family: string) => {
    setSelectedFont(family);
    execCmd('fontName', family);
  };

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

  const applyTextColor = (color: string) => {
    setTextColor(color);
    execCmd('foreColor', color);
    setShowTextColorPicker(false);
  };

  const applyHighlightColor = (color: string) => {
    setHighlightColor(color);
    execCmd('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  // ---- Toolbar Button ----
  const ToolbarButton = ({ icon: Icon, cmd, val, title, onClick, active }: any) => (
    <button 
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick || (() => execCmd(cmd, val))} 
      className={`p-2 rounded-xl transition-all print:hidden ${
        (active || (cmd && activeFormats[cmd])) 
          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30' 
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
      if (key === 'h' || key === 'f') { e.preventDefault(); setShowFindReplace(!showFindReplace); return; }
      if (e.shiftKey && key === 's') { e.preventDefault(); execCmd('strikeThrough'); return; }
      
      switch (key) {
        case 'n': case 'b': cmd = 'bold'; break;
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
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
      className={`w-full flex flex-col ${isFocusMode ? 'fixed inset-0 z-[100] bg-neutral-100 dark:bg-neutral-950 overflow-y-auto p-4' : '-mt-8'}`}
    >
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleInsertImage} />

      {/* TOP NAVBAR */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden shadow-sm rounded-t-3xl -mx-4 sm:mx-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button 
            onClick={() => {
              if (isDirtyRef.current) {
                setConfirmConfig({
                  title: 'Alterações não salvas',
                  message: 'Você possui alterações pendentes. Se sair agora, o que não foi salvo será descartado.',
                  confirmText: 'Sair mesmo assim',
                  isDestructive: true,
                  onConfirm: () => { setConfirmConfig(null); onClose(); },
                });
                return;
              }
              onClose();
            }} 
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 shrink-0"
          >
            <ChevronLeft size={16} /> Voltar
          </button>
          
          <div className="flex-1 max-w-md border-l border-neutral-200 dark:border-neutral-800 pl-3">
            <input 
              value={title}
              onChange={e => { setTitle(e.target.value); markDirty(); }}
              className="w-full bg-transparent text-base font-black text-neutral-900 dark:text-white outline-none border-b-2 border-transparent focus:border-blue-600 px-2 py-0.5 transition-all truncate"
              placeholder="Título do Documento..."
            />
          </div>

          {lastSaved && (
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:flex items-center gap-1 shrink-0">
              <Check size={13} className="text-emerald-500" /> Salvo às {lastSaved}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`p-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              isFocusMode ? 'bg-blue-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
            title={isFocusMode ? 'Sair do Modo Foco' : 'Modo Foco / Tela Cheia'}
          >
            {isFocusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            <Printer size={15} /> <span className="hidden lg:inline">Imprimir / PDF</span>
          </button>

          <button onClick={handleExportDocx} className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-100 transition-colors">
            <Download size={15} /> <span className="hidden lg:inline">Exportar Word</span>
          </button>

          <button onClick={() => handleSave('Rascunho')} className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-amber-100 transition-colors">
            <Save size={15} /> Salvar Rascunho
          </button>

          <button onClick={() => { handleSave('Finalizado'); showToast('Documento finalizado com sucesso!', 'success'); }} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/20 hover:scale-105 transition-all">
            <Send size={15} /> Finalizar
          </button>
        </div>
      </div>

      {/* FIND & REPLACE BAR */}
      {showFindReplace && (
        <div className="sticky top-[69px] z-30 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-6 py-2.5 print:hidden -mx-4 sm:mx-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <SearchIcon size={15} className="text-amber-600 shrink-0" />
              <input
                type="text"
                value={findText}
                onChange={e => setFindText(e.target.value)}
                placeholder="Buscar no documento..."
                className="flex-1 bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />
              {findText && <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">{findCount} ocorrência(s)</span>}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Replace size={15} className="text-amber-600 shrink-0" />
              <input
                type="text"
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                placeholder="Substituir por..."
                className="flex-1 bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex items-center gap-1">
              <button onMouseDown={e => e.preventDefault()} onClick={handleReplaceOne} className="px-3 py-1 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg text-xs font-bold hover:bg-amber-300 transition-colors">Substituir</button>
              <button onMouseDown={e => e.preventDefault()} onClick={handleReplaceAll} className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors">Substituir Tudo</button>
              <button onClick={() => { clearFindHighlights(); setShowFindReplace(false); setFindText(''); setReplaceText(''); }} className="p-1 text-amber-600 hover:bg-amber-200 rounded-lg transition-colors"><X size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {/* RICH TOOLBAR */}
      <div className={`sticky ${showFindReplace ? 'top-[115px]' : 'top-[69px]'} z-30 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2 flex flex-wrap items-center justify-center gap-1 print:hidden shadow-sm -mx-4 sm:mx-0`}>
        
        {/* GRUPO 1: TIMBRE & PAPEL TIMBRADO (DESTAQUE MÁXIMO) */}
        <div className="flex items-center gap-1 bg-blue-50/80 dark:bg-blue-950/30 p-1 rounded-2xl border border-blue-200 dark:border-blue-900/50 mr-2">
          <button
            type="button"
            onClick={() => setIsTimbreModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Shield size={14} /> Timbre & Papel Timbrado
          </button>

          <button
            type="button"
            onClick={toggleTimbre}
            title={isTimbreActive ? 'Desativar Timbre (Deixar folha limpa)' : 'Ativar Timbre Oficial'}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors ${
              isTimbreActive 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            {isTimbreActive ? 'Timbre ON' : 'Timbre OFF'}
          </button>
        </div>

        {/* Font Family */}
        <select 
          value={selectedFont}
          onMouseDown={e => e.stopPropagation()}
          onChange={e => applyFontFamily(e.target.value)}
          className="h-8 px-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none cursor-pointer min-w-[125px]"
        >
          {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>

        {/* Font Size */}
        <select 
          value={selectedSize}
          onMouseDown={e => e.stopPropagation()}
          onChange={e => applyFontSize(e.target.value)}
          className="h-8 px-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none cursor-pointer w-16"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}
        </select>

        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center" />

        <ToolbarButton icon={Undo} cmd="undo" title="Desfazer (Ctrl+Z)" />
        <ToolbarButton icon={Redo} cmd="redo" title="Refazer (Ctrl+Y)" />
        
        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center" />
        
        <ToolbarButton icon={Bold} cmd="bold" title="Negrito (Ctrl+N)" />
        <ToolbarButton icon={Italic} cmd="italic" title="Itálico (Ctrl+I)" />
        <ToolbarButton icon={Underline} cmd="underline" title="Sublinhado (Ctrl+U)" />
        <ToolbarButton icon={Strikethrough} cmd="strikeThrough" title="Tachado" />

        {/* Text Color */}
        <div className="relative">
          <button
            type="button"
            title="Cor do Texto"
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setShowTextColorPicker(!showTextColorPicker); }}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <div className="flex flex-col items-center gap-0.5">
              <Type size={14} />
              <div className="w-3.5 h-1 rounded-full" style={{ backgroundColor: textColor }} />
            </div>
          </button>
          {showTextColorPicker && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-3 z-50 w-52" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">Cor do Texto</p>
              <div className="grid grid-cols-7 gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => applyTextColor(c)}
                    className="w-5 h-5 rounded-full border border-neutral-200 dark:border-neutral-700 hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight Color */}
        <div className="relative">
          <button
            type="button"
            title="Cor de Realce (Marca-Texto)"
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setShowHighlightPicker(!showHighlightPicker); }}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <div className="flex flex-col items-center gap-0.5">
              <Highlighter size={14} />
              <div className="w-3.5 h-1 rounded-full" style={{ backgroundColor: highlightColor }} />
            </div>
          </button>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-3 z-50 w-52" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">Cor de Realce</p>
              <div className="grid grid-cols-7 gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => applyHighlightColor(c)}
                    className="w-5 h-5 rounded-full border border-neutral-200 dark:border-neutral-700 hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => applyHighlightColor('transparent')}
                className="mt-2.5 w-full text-[10px] text-neutral-500 font-bold uppercase tracking-wider py-1 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Remover Realce
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center" />

        <ToolbarButton icon={AlignLeft} cmd="justifyLeft" title="Alinhar à Esquerda (Ctrl+Q)" />
        <ToolbarButton icon={AlignCenter} cmd="justifyCenter" title="Centralizar (Ctrl+E)" />
        <ToolbarButton icon={AlignRight} cmd="justifyRight" title="Alinhar à Direita (Ctrl+D)" />
        <ToolbarButton icon={AlignJustify} cmd="justifyFull" title="Justificado (Ctrl+J)" />
        
        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center" />

        <ToolbarButton icon={List} cmd="insertUnorderedList" title="Lista com Marcadores" />
        <ToolbarButton icon={ListOrdered} cmd="insertOrderedList" title="Lista Numerada" />
        <ToolbarButton icon={Indent} cmd="indent" title="Aumentar Recuo (Tab)" />
        <ToolbarButton icon={Outdent} cmd="outdent" title="Diminuir Recuo" />

        {/* Line Spacing */}
        <div className="relative">
          <ToolbarButton 
            icon={ArrowUpDown} 
            onClick={(e: any) => { e.stopPropagation(); setIsSpacingMenuOpen(!isSpacingMenuOpen); }} 
            title="Espaçamento de Linha" 
          />
          {isSpacingMenuOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl py-2 w-44 z-50" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-4 pb-1">Entrelinhas</p>
              {[
                { label: '1.0 (Simples)', value: '1' },
                { label: '1.15', value: '1.15' },
                { label: '1.5 (Oficial ABNT)', value: '1.5' },
                { label: '2.0 (Duplo)', value: '2' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => applySpacing(opt.value)}
                  className="w-full text-left px-4 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-blue-50 hover:text-blue-600 font-semibold transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center" />

        {/* GRUPO: ESTILOS OFICIAIS ABNT */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setIsStylesMenuOpen(!isStylesMenuOpen); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 rounded-xl transition-colors"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Estilos ABNT</span>
            <ChevronDown size={12} />
          </button>
          {isStylesMenuOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl py-2 w-64 z-50" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-4 pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">Padrões de Redação Oficial</p>
              {[
                { label: 'Parágrafo Oficial (Recuo 2,5cm)', action: () => applyOfficialStyle('paragrafo_abnt') },
                { label: 'Ementa (Recuo 50% à Direita)', action: () => applyOfficialStyle('ementa') },
                { label: 'Artigo de Lei / Decreto (Art. 1º)', action: () => applyOfficialStyle('artigo') },
                { label: 'Citação Longa (Recuo 4cm)', action: () => applyOfficialStyle('citacao') },
                { label: 'Fecho: Respeitosamente,', action: () => applyOfficialStyle('fecho_respeitosamente') },
                { label: 'Fecho: Atenciosamente,', action: () => applyOfficialStyle('fecho_atenciosamente') },
              ].map((st, i) => (
                <button
                  key={i}
                  onMouseDown={e => e.preventDefault()}
                  onClick={st.action}
                  className="w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-blue-50 hover:text-blue-600 font-semibold transition-colors"
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GRUPO: MENU INSERIR */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setIsInsertMenuOpen(!isInsertMenuOpen); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 rounded-xl transition-colors"
          >
            <Plus size={14} className="text-blue-500" />
            <span>Inserir</span>
            <ChevronDown size={12} />
          </button>
          {isInsertMenuOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl py-2 w-64 z-50" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-4 pb-1.5 border-b border-neutral-100 dark:border-neutral-800 mb-1">Elementos do Documento</p>
              
              <button onMouseDown={e => e.preventDefault()} onClick={insertCurrentDate} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                <Calendar size={14} /> Data Atual por Extenso
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={insertBrasaoAtCursor} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                <Shield size={14} /> Brasão Oficial no Cursor
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                <ImageIcon size={14} /> Inserir Imagem / Foto
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={insertPageBreak} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                <FileText size={14} /> Quebra de Página Oficial
              </button>

              <div className="w-full h-px bg-neutral-100 dark:bg-neutral-800 my-1.5" />
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-4 pb-1">Blocos de Assinatura</p>

              <button onMouseDown={e => e.preventDefault()} onClick={() => insertSignatureBlock('simples')} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600">
                ✍️ 1 Signatário (Padrão)
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => insertSignatureBlock('dupla')} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600">
                ✍️ 2 Signatários (Lado a Lado)
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => insertSignatureBlock('trio')} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600">
                ✍️ Comissão / 3 Signatários
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => insertSignatureBlock('digital')} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600">
                🔒 Assinatura com Selo Digital & QR
              </button>

              <div className="w-full h-px bg-neutral-100 dark:bg-neutral-800 my-1.5" />
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-4 pb-1">Caixas de Destaque</p>

              <button onMouseDown={e => e.preventDefault()} onClick={() => insertCalloutBox('info')} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600">
                ℹ️ Caixa de Informação
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => insertCalloutBox('aviso')} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600">
                ⚠️ Caixa de Aviso / Alerta
              </button>
            </div>
          )}
        </div>

        {/* Table Grid Picker */}
        <div className="relative">
          <ToolbarButton 
            icon={TableProperties} 
            onClick={(e: any) => { e.stopPropagation(); setShowTableGrid(!showTableGrid); }} 
            title="Inserir Tabela" 
          />
          {showTableGrid && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-3 z-50" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">Tabela {tableGridHover.rows > 0 ? `${tableGridHover.rows} × ${tableGridHover.cols}` : ''}</p>
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
          )}
        </div>

        <ToolbarButton icon={Minus} cmd="insertHorizontalRule" title="Linha Divisória" />

        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 self-center" />

        {/* Margins */}
        <div className="relative">
          <ToolbarButton 
            icon={LayoutTemplate} 
            onClick={(e: any) => { e.stopPropagation(); setShowMarginsMenu(!showMarginsMenu); }} 
            title="Margens do Documento" 
          />
          {showMarginsMenu && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl py-2 w-56 z-50" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-4 pb-1">Margens da Folha</p>
              {(Object.entries(MARGIN_PRESETS) as [MarginPreset, {label:string}][]).map(([key, preset]) => (
                <button
                  key={key}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setMargins(key); setShowMarginsMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center justify-between ${
                    margins === key ? 'bg-blue-50 text-blue-600 dark:bg-neutral-800' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <span>{preset.label}</span>
                  {margins === key && <Check size={14} className="text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Smart Variables Dropdown */}
        <div className="relative">
          <button
            type="button"
            title="Campos Inteligentes Dinâmicos"
            onMouseDown={e => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); setShowSmartVars(!showSmartVars); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 rounded-xl transition-colors border border-sky-200 dark:border-sky-800"
          >
            <Workflow size={14} /> Variáveis
          </button>
          {showSmartVars && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl py-2 w-64 z-50" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-4 pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">Inserir Campo Inteligente</p>
              {[
                { label: 'Data por Extenso', value: 'DATA_EXTENSO' },
                { label: 'Data Curta (DD/MM/AAAA)', value: 'DATA_CURTA' },
                { label: 'Nome do Município', value: 'NOME_MUNICIPIO' },
                { label: 'Nome da Secretaria', value: 'NOME_SECRETARIA' },
                { label: 'Nome do Usuário', value: 'NOME_USUARIO' },
                { label: 'Cargo do Usuário', value: 'CARGO_USUARIO' },
                { label: 'Número do Documento', value: 'NUMERO_DOCUMENTO' },
                { label: 'Número do Protocolo', value: 'PROTOCOLO' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => insertSmartVar(opt.value)}
                  className="w-full text-left px-4 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-sky-50 hover:text-sky-600 font-semibold transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Process Variables Action */}
        <button
          type="button"
          title="Processar Variáveis (Preencher campos com dados reais)"
          onMouseDown={e => e.preventDefault()}
          onClick={replaceSmartVars}
          className="p-2 bg-neutral-100 hover:bg-emerald-100 text-neutral-700 hover:text-emerald-700 dark:bg-neutral-800 dark:hover:bg-emerald-900/40 rounded-xl transition-colors"
        >
          <Wand2 size={15} />
        </button>

        {/* Search & Replace Toggle */}
        <ToolbarButton 
          icon={SearchIcon} 
          onClick={() => setShowFindReplace(!showFindReplace)} 
          title="Localizar e Substituir (Ctrl+F / Ctrl+H)" 
          active={showFindReplace}
        />
      </div>

      {/* A4 CANVAS CONTAINER */}
      <div className="py-12 print:py-0 w-full flex justify-center relative select-text">
        
        {/* FLOATING STATUS BAR */}
        <div className="fixed bottom-6 right-6 flex items-center gap-2.5 print:hidden z-50">
          {/* Word Count */}
          <div className="bg-neutral-900/90 backdrop-blur-md text-neutral-300 px-4 py-2 rounded-2xl shadow-xl font-medium text-xs flex items-center gap-3 border border-neutral-800">
            <span>{getWordCount().words} palavras</span>
            <span className="w-px h-3 bg-neutral-700" />
            <span>~{getWordCount().readingTime} min leitura</span>
          </div>

          {/* Zoom Controls */}
          <div className="bg-neutral-900/90 backdrop-blur-md text-white px-2 py-1 rounded-2xl shadow-xl font-medium text-xs flex items-center gap-1 border border-neutral-800">
            <button onClick={() => setZoom(Math.max(50, zoom - 15))} className="p-1.5 hover:bg-neutral-800 rounded-xl transition-colors" title="Diminuir Zoom"><ZoomOut size={14} /></button>
            <button onClick={() => setZoom(100)} className="px-2 py-1 hover:bg-neutral-800 rounded-xl transition-colors min-w-[46px] text-center font-bold" title="Resetar">{zoom}%</button>
            <button onClick={() => setZoom(Math.min(180, zoom + 15))} className="p-1.5 hover:bg-neutral-800 rounded-xl transition-colors" title="Aumentar Zoom"><ZoomIn size={14} /></button>
          </div>

          {/* Guides Toggle */}
          <button 
            onClick={() => setShowGuides(!showGuides)} 
            className={`px-3 py-2 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-1.5 transition-colors border border-neutral-800 ${
              showGuides ? 'bg-neutral-900/90 text-neutral-300' : 'bg-blue-600 text-white'
            }`}
            title="Alternar Réguas e Guias Visuais"
          >
            <LayoutTemplate size={14} />
            <span className="hidden md:inline">{showGuides ? 'Guias ON' : 'Guias OFF'}</span>
          </button>

          {/* Page Counter */}
          <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-1.5 shadow-blue-600/30">
            <FileText size={15} />
            <span>{pages} {pages === 1 ? 'Página' : 'Páginas'}</span>
          </div>
        </div>

        {/* A4 PAPER ELEMENT */}
        <div 
          ref={containerRef}
          className="w-[21cm] min-h-[29.7cm] bg-white shadow-2xl print:shadow-none print:w-full print:max-w-none mx-4 sm:mx-auto relative transition-transform origin-top cursor-text rounded-sm"
          style={{ 
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined, 
            marginBottom: zoom < 100 ? `calc(29.7cm * ${(zoom/100) - 1})` : undefined 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'TD' || (e.target as HTMLElement).tagName === 'TABLE') {
              bodyRef.current?.focus();
            }
          }}
        >
          {/* BACKGROUND LETTERHEAD (FULL PAGE IMAGE) */}
          {isTimbreActive && timbreConfig.backgroundImageUrl && (
            <div 
              className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none z-0"
              style={{ 
                backgroundImage: `url(${timbreConfig.backgroundImageUrl})`,
                opacity: timbreConfig.backgroundOpacity ?? 1
              }}
            />
          )}

          {/* WATERMARK LAYER */}
          {watermarkConfig.type !== 'none' && (
            <div style={getWatermarkStyles(watermarkConfig, timbreConfig) || undefined}>
              {getWatermarkText(watermarkConfig)}
            </div>
          )}

          {/* VISUAL RULER */}
          {showGuides && (
            <div className="w-full h-7 bg-neutral-100/90 dark:bg-neutral-800/90 border-b border-neutral-300 dark:border-neutral-700 relative flex items-center print:hidden select-none z-20">
              <div className="absolute inset-y-0 left-0 bg-neutral-300/40 border-r border-neutral-400" style={{ width: MARGIN_PRESETS[margins].left }} />
              <div className="absolute inset-y-0 right-0 bg-neutral-300/40 border-l border-neutral-400" style={{ width: MARGIN_PRESETS[margins].right }} />
              <div className="absolute inset-0 flex justify-between pointer-events-none px-[2px]">
                {Array.from({ length: 22 }).map((_, cm) => (
                  <div key={cm} className="flex flex-col items-center justify-end h-full relative" style={{ width: cm === 21 ? '0px' : 'calc(100% / 21)' }}>
                    <div className={`w-px ${cm % 5 === 0 ? 'h-3 bg-neutral-500' : 'h-1.5 bg-neutral-300'}`} />
                    {cm > 0 && cm < 21 && (cm % 2 === 0 || cm === 1 || cm === 19) && (
                      <span className="text-[8px] font-bold text-neutral-500 absolute bottom-3">{cm}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISUAL PAGE BREAK GUIDES */}
          {showGuides && Array.from({ length: Math.max(0, pages - 1) }).map((_, i) => (
            <div 
              key={i} 
              className="absolute left-0 w-full border-t-2 border-dashed border-blue-400 z-20 flex items-center justify-center pointer-events-none print:hidden"
              style={{ top: `calc(29.7cm * ${i + 1})` }}
            >
              <span className="bg-blue-500 text-white text-[10px] px-3 py-0.5 rounded-full -translate-y-1/2 shadow-sm font-bold uppercase tracking-wider">
                Fim da Página {i + 1}
              </span>
            </div>
          ))}

          {/* MULTI-PAGE TABLE STRUCTURE */}
          <table className="w-full h-full border-collapse relative z-10">
            
            {/* THEAD: CABEÇALHO REPETIDO */}
            <thead className="print:table-header-group w-full">
              <tr>
                <td className="w-full p-0">
                  <div className="w-full relative group">
                    {showGuides && (
                      <div className="absolute -left-36 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-neutral-400 print:hidden pointer-events-none">
                        Cabeçalho <div className="w-6 h-px bg-neutral-300" />
                      </div>
                    )}
                    <UncontrolledEditable
                      innerRef={headerRef}
                      className={`pt-10 pb-4 outline-none max-w-none text-neutral-900 min-h-[90px] transition-colors print:border-none focus:bg-neutral-50/50 select-text ${
                        showGuides ? 'hover:bg-neutral-50/50 border-b border-dashed border-transparent hover:border-neutral-200' : 'border-b border-transparent'
                      }`}
                      style={{ paddingLeft: MARGIN_PRESETS[margins].left, paddingRight: MARGIN_PRESETS[margins].right }}
                      onFocus={() => setActiveRegion('header')}
                      onBlur={(e: any) => setHeader(e.currentTarget.innerHTML)}
                      onInput={markDirty}
                      onKeyDown={handleKeyDown}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      initialHtml={initialHeader.current}
                    />
                  </div>
                </td>
              </tr>
            </thead>

            {/* TBODY: CORPO DO DOCUMENTO */}
            <tbody className="w-full">
              <tr>
                <td className="w-full p-0 align-top h-full">
                  <div className="flex-1 w-full relative group h-full">
                    {showGuides && (
                      <div className="absolute -left-36 top-12 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-neutral-400 print:hidden pointer-events-none">
                        Corpo <div className="w-6 h-px bg-neutral-300" />
                      </div>
                    )}
                    <UncontrolledEditable
                      innerRef={bodyRef}
                      className="py-6 outline-none max-w-none text-neutral-900 text-justify h-full min-h-[550px] select-text"
                      style={{ 
                        fontFamily: 'Times New Roman, serif', 
                        fontSize: '12pt', 
                        lineHeight: '1.5', 
                        paddingLeft: MARGIN_PRESETS[margins].left, 
                        paddingRight: MARGIN_PRESETS[margins].right 
                      }}
                      onFocus={() => setActiveRegion('body')}
                      onBlur={(e: any) => setContent(e.currentTarget.innerHTML)}
                      onInput={markDirty}
                      onKeyDown={handleKeyDown}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      initialHtml={initialContent.current}
                    />
                  </div>
                </td>
              </tr>
            </tbody>

            {/* TFOOT: RODAPÉ REPETIDO */}
            <tfoot className="print:table-footer-group w-full">
              <tr>
                <td className="w-full p-0">
                  <div className="w-full relative group mt-auto">
                    {showGuides && (
                      <div className="absolute -left-36 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-neutral-400 print:hidden pointer-events-none">
                        Rodapé <div className="w-6 h-px bg-neutral-300" />
                      </div>
                    )}
                    <UncontrolledEditable
                      innerRef={footerRef}
                      className={`pt-4 pb-8 outline-none max-w-none text-neutral-900 min-h-[80px] transition-colors print:border-none focus:bg-neutral-50/50 text-center text-xs ${
                        showGuides ? 'hover:bg-neutral-50/50 border-t border-dashed border-transparent hover:border-neutral-200' : 'border-t border-transparent'
                      }`}
                      style={{ paddingLeft: MARGIN_PRESETS[margins].left, paddingRight: MARGIN_PRESETS[margins].right }}
                      onFocus={() => setActiveRegion('footer')}
                      onBlur={(e: any) => setFooter(e.currentTarget.innerHTML)}
                      onInput={markDirty}
                      onKeyDown={handleKeyDown}
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

      {/* TIMBRE & PAPEL TIMBRADO MODAL */}
      <TimbreModal
        isOpen={isTimbreModalOpen}
        onClose={() => setIsTimbreModalOpen(false)}
        currentTimbre={timbreConfig}
        currentWatermark={watermarkConfig}
        onApplyTimbre={handleApplyTimbre}
      />

      <ConfirmModal isOpen={!!confirmConfig} onCancel={() => setConfirmConfig(null)} {...confirmConfig} />
    </motion.div>
  );
};
