import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, Plus, Trash2, Edit2, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, CheckCircle2, Receipt, Wallet, Calendar, Save,
  RefreshCw, Download, Printer, Search, X, BarChart3, Scale, Layers,
  Landmark, Cloud, HardDrive, ChevronLeft, ChevronRight, ArrowLeftRight, FileCode2
} from 'lucide-react';
import { 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Line, ComposedChart
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { Institution, AdminUser } from '../../types';
import { showToast } from '../../components/ui/Toast';

export type AccountCategory = 
  | 'Movimento' 
  | 'FUS / Saúde' 
  | 'Educação' 
  | 'FUNDEB' 
  | 'Custeio' 
  | 'Complementar'
  | 'Verbas Indenizatórias' 
  | 'Investimentos' 
  | 'Arrecadação / Próprios' 
  | 'Outros';

export const ACCOUNT_CATEGORIES: AccountCategory[] = [
  'Movimento',
  'FUS / Saúde',
  'Educação',
  'FUNDEB',
  'Custeio',
  'Complementar',
  'Verbas Indenizatórias',
  'Investimentos',
  'Arrecadação / Próprios',
  'Outros'
];

export interface ExtratoLine {
  id: string;
  account: string;
  amount: number;
  description?: string;
  date?: string;
}

export interface ExtratoFile {
  id: string;
  fileName: string;
  fileType: 'CNAB 240' | 'CNAB 400' | 'OFX' | 'Extrato TXT' | 'CSV' | 'Manual';
  totalAmount: number;
  category: AccountCategory;
  lines: ExtratoLine[];
  isExpanded?: boolean;
  uploadDate: string;
}

export interface InvoiceItem {
  id: string;
  category: AccountCategory;
  amount: number;
  number?: string;
  supplier?: string;
  description?: string;
  date?: string;
}

export interface MonthlyRecord {
  monthId: string;     // Ex: '2026-10'
  monthLabel: string;  // Ex: 'Outubro/2026'
  files: ExtratoFile[];
  invoices: InvoiceItem[];
  savedAt: string;
  notes?: string;
}

interface ComparativoExtratosProps {
  currentInstitution?: Institution | null;
  currentUser?: AdminUser | null;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const getCurrentMonthId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const formatMonthLabel = (monthId: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!match) return monthId;
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthId;
  return `${MONTH_NAMES_PT[monthIdx]}/${year}`;
};

export const formatShortMonthLabel = (monthId: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!match) return monthId;
  const yearShort = match[1].slice(2);
  const monthIdx = parseInt(match[2], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthId;
  return `${MONTH_NAMES_PT[monthIdx].slice(0, 3)}/${yearShort}`;
};

export const addMonthsToId = (monthId: string, delta: number): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!match) return getCurrentMonthId();
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const d = new Date(year, month + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const parseBRL = (valStr: string): number => {
  if (!valStr) return 0;
  let s = valStr.toString().trim().replace(/R\$\s*/gi, '').replace(/[DCdc]$/, '').trim();
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
    return Math.abs(parseFloat(s)) || 0;
  }
  return Math.abs(parseFloat(s)) || 0;
};

interface RawMonthlyInput {
  monthId?: unknown;
  monthLabel?: unknown;
  files?: unknown;
  invoices?: unknown;
  savedAt?: unknown;
  notes?: unknown;
}

// Normaliza registros vindos de versões anteriores ou modo demonstração
const normalizeMonthlyRecord = (monthId: string, raw: RawMonthlyInput): MonthlyRecord => {
  const rawFiles: Record<string, unknown>[] = Array.isArray(raw?.files) ? (raw.files as Record<string, unknown>[]) : [];
  const rawInvoices: Record<string, unknown>[] = Array.isArray(raw?.invoices) ? (raw.invoices as Record<string, unknown>[]) : [];

  const normalizedFiles: ExtratoFile[] = rawFiles.map((f, idx) => {
    const rawLinesList = Array.isArray(f.lines) ? (f.lines as Record<string, unknown>[]) : [];
    return {
      id: typeof f.id === 'string' && f.id ? f.id : `file-${monthId}-${idx}`,
      fileName: typeof f.fileName === 'string' && f.fileName ? f.fileName : `Extrato ${idx + 1}`,
      fileType: (f.fileType as ExtratoFile['fileType']) || 'Extrato TXT',
      totalAmount: Number(f.totalAmount) || 0,
      category: ACCOUNT_CATEGORIES.includes(f.category as AccountCategory) ? (f.category as AccountCategory) : 'Outros',
      lines: rawLinesList.map((l, lIdx) => ({
        id: typeof l.id === 'string' && l.id ? l.id : `line-${idx}-${lIdx}`,
        account: typeof l.account === 'string' && l.account ? l.account : `Lançamento ${lIdx + 1}`,
        amount: Number(l.amount) || 0,
        description: typeof l.description === 'string' ? l.description : undefined,
        date: typeof l.date === 'string' ? l.date : undefined
      })),
      isExpanded: false,
      uploadDate: typeof f.uploadDate === 'string' && f.uploadDate ? f.uploadDate : `${monthId}-01`
    };
  });

  const normalizedInvoices: InvoiceItem[] = rawInvoices.map((inv, idx) => {
    const legacyAccount = typeof inv.account === 'string' ? inv.account : undefined;
    const catCandidate = (inv.category || legacyAccount) as AccountCategory;
    const category: AccountCategory = ACCOUNT_CATEGORIES.includes(catCandidate) ? catCandidate : 'Outros';
    const number = typeof inv.number === 'string' ? inv.number : undefined;
    const supplier = typeof inv.supplier === 'string' ? inv.supplier : undefined;
    const fallbackDesc = [number, supplier].filter(Boolean).join(' — ');

    return {
      id: typeof inv.id === 'string' && inv.id ? inv.id : `nf-${monthId}-${idx}`,
      category,
      amount: Number(inv.amount) || 0,
      number,
      supplier,
      description: typeof inv.description === 'string' && inv.description ? inv.description : (fallbackDesc || undefined),
      date: typeof inv.date === 'string' ? inv.date : (typeof inv.issueDate === 'string' ? inv.issueDate : `${monthId}-01`)
    };
  });

  return {
    monthId,
    monthLabel: formatMonthLabel(monthId),
    files: normalizedFiles,
    invoices: normalizedInvoices,
    savedAt: typeof raw?.savedAt === 'string' && raw.savedAt ? raw.savedAt : new Date().toISOString(),
    notes: typeof raw?.notes === 'string' ? raw.notes : undefined
  };
};

// =========================================================================
// PARSER INTELIGENTE DE ARQUIVOS FINANCEIROS (CNAB 240, CNAB 400, OFX, TXT, CSV)
// =========================================================================
export const parseFinancialContent = (
  content: string,
  fileName: string
): { lines: ExtratoLine[]; totalAmount: number; fileType: ExtratoFile['fileType']; detectedCategory: AccountCategory } => {
  const parsedLines: ExtratoLine[] = [];
  let totalAmount = 0;
  let fileType: ExtratoFile['fileType'] = 'Extrato TXT';

  const isOfx = /<OFX>/i.test(content) || /<STMTTRN>/i.test(content);
  const rawLines = content.split(/\r?\n/);
  const isCnab240 = !isOfx && rawLines.some(l => l.length >= 238 && l.length <= 245);
  const isCnab400 = !isOfx && !isCnab240 && rawLines.some(l => l.length >= 398 && l.length <= 405);
  const isCsv = !isOfx && (fileName.toLowerCase().endsWith('.csv') || content.includes(';'));

  if (isOfx) {
    fileType = 'OFX';
    const blocks = content.split(/<STMTTRN>/i).slice(1);
    blocks.forEach((block, idx) => {
      const amtMatch = block.match(/<TRNAMT>([^\r\n<]+)/i);
      const memoMatch = block.match(/<MEMO>([^\r\n<]+)/i) || block.match(/<NAME>([^\r\n<]+)/i);
      const dtMatch = block.match(/<DTPOSTED>(\d{4})(\d{2})(\d{2})/i);
      if (amtMatch) {
        const rawNum = parseFloat(amtMatch[1].trim().replace(',', '.'));
        const amount = Math.abs(rawNum);
        if (amount > 0 && !isNaN(amount)) {
          const date = dtMatch ? `${dtMatch[3]}/${dtMatch[2]}/${dtMatch[1]}` : undefined;
          const desc = memoMatch ? memoMatch[1].trim() : `Movimentação OFX ${idx + 1}`;
          parsedLines.push({
            id: `ofx-${idx}`,
            account: desc,
            amount,
            date
          });
          totalAmount += amount;
        }
      }
    });
  } else if (isCnab240) {
    fileType = 'CNAB 240';
    rawLines.forEach((line, idx) => {
      if (line.length < 100) return;

      const recordType = line[7];
      const segmentType = line[13];

      if (recordType === '3') {
        let name = '';
        let amount = 0;
        let date = '';

        if (segmentType === 'A') {
          name = line.substring(43, 73).trim() || 'Favorecido Segmento A';
          const rawVal = line.substring(119, 134);
          amount = parseInt(rawVal, 10) / 100;
          const day = line.substring(93, 95);
          const month = line.substring(95, 97);
          const year = line.substring(97, 101);
          if (day && month && year) date = `${day}/${month}/${year}`;
        } else if (segmentType === 'J') {
          name = line.substring(152, 182).trim() || 'Pagamento de Boleto/Título';
          const rawVal = line.substring(91, 106);
          amount = parseInt(rawVal, 10) / 100;
        } else if (segmentType === 'O' || segmentType === 'N') {
          name = line.substring(43, 73).trim() || 'Pagamento de Tributo/Concessionária';
          const rawVal = line.substring(91, 106);
          amount = parseInt(rawVal, 10) / 100;
        }

        if (amount > 0 && !isNaN(amount)) {
          parsedLines.push({
            id: `cnab240-${idx}`,
            account: name,
            amount,
            date
          });
          totalAmount += amount;
        }
      }
    });
  } else if (isCnab400) {
    fileType = 'CNAB 400';
    rawLines.forEach((line, idx) => {
      if (line.length < 200) return;
      const recordType = line[0];
      if (recordType === '1') {
        const rawVal = line.substring(126, 139);
        const amount = parseInt(rawVal, 10) / 100;
        const name = line.substring(234, 274).trim() || 'Pagamento CNAB 400';
        if (amount > 0 && !isNaN(amount)) {
          parsedLines.push({
            id: `cnab400-${idx}`,
            account: name,
            amount
          });
          totalAmount += amount;
        }
      }
    });
  } else {
    fileType = isCsv ? 'CSV' : 'Extrato TXT';

    rawLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const lower = trimmed.toLowerCase();
      if (
        lower.startsWith('data;') ||
        lower.startsWith('data,') ||
        lower.startsWith('data\t') ||
        lower.includes('extrato de conta') ||
        lower.includes('saldo anterior') ||
        lower.includes('saldo final')
      ) {
        return;
      }

      if (trimmed.includes(';') || trimmed.includes(',')) {
        const parts = trimmed.includes(';') ? trimmed.split(';') : trimmed.split(',');
        let foundAmount = 0;
        let foundDesc = '';
        let foundDate = '';

        for (const part of parts) {
          const p = part.trim().replace(/^"|"$/g, '').replace(/R\$\s*/gi, '');
          if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(p)) {
            foundDate = p;
          } else if (/^-?[\d\.]+(?:,\d{2})?\s*[DCdc]?$/.test(p) || /^-?\d+(?:\.\d{2})$/.test(p)) {
            const num = parseBRL(p);
            if (num > 0) foundAmount = num;
          } else if (p.length > 2) {
            if (!foundDesc) foundDesc = p;
          }
        }

        if (foundAmount > 0) {
          parsedLines.push({
            id: `csv-${idx}`,
            account: foundDesc || `Lançamento Linha ${idx + 1}`,
            amount: foundAmount,
            date: foundDate || undefined
          });
          totalAmount += foundAmount;
          return;
        }
      }

      let cleanText = trimmed.replace(/\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g, ' ');
      cleanText = cleanText.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, ' ');
      cleanText = cleanText.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, ' ');

      const matches = cleanText.match(/(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2})|-?(\d+,\d{2})|-?(\d+\.\d{2})/g);

      if (matches && matches.length > 0) {
        const rawAmount = matches[matches.length - 1];
        const amount = parseBRL(rawAmount);

        if (amount > 0 && !isNaN(amount)) {
          let desc = trimmed;
          const pos = desc.lastIndexOf(rawAmount);
          if (pos !== -1) {
            desc = desc.substring(0, pos) + desc.substring(pos + rawAmount.length);
          }
          desc = desc
            .replace(/R\$\s*/gi, '')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[-:;|\s]+$/, '')
            .trim();

          parsedLines.push({
            id: `txt-${idx}`,
            account: desc || `Lançamento ${idx + 1}`,
            amount
          });
          totalAmount += amount;
        }
      }
    });
  }

  const nameLower = fileName.toLowerCase();
  let detectedCategory: AccountCategory = 'Outros';
  if (nameLower.includes('complementar') || nameLower.includes('compl')) detectedCategory = 'Complementar';
  else if (nameLower.includes('movimento')) detectedCategory = 'Movimento';
  else if (nameLower.includes('fus') || nameLower.includes('saude') || nameLower.includes('saúde')) detectedCategory = 'FUS / Saúde';
  else if (nameLower.includes('educacao') || nameLower.includes('educação') || nameLower.includes('mde')) detectedCategory = 'Educação';
  else if (nameLower.includes('fundeb')) detectedCategory = 'FUNDEB';
  else if (nameLower.includes('custeio')) detectedCategory = 'Custeio';
  else if (nameLower.includes('verba') || nameLower.includes('indeniz') || nameLower.includes('diaria')) detectedCategory = 'Verbas Indenizatórias';
  else if (nameLower.includes('invest') || nameLower.includes('obra') || nameLower.includes('convenio')) detectedCategory = 'Investimentos';
  else if (nameLower.includes('proprio') || nameLower.includes('arrecada') || nameLower.includes('tributo') || nameLower.includes('fpm') || nameLower.includes('icms')) detectedCategory = 'Arrecadação / Próprios';

  return { lines: parsedLines, totalAmount, fileType, detectedCategory };
};

// Parser para XML de Nota Fiscal Eletrônica (NF-e Modelo 55 e NFS-e Nacional/Municipal)
const parseInvoiceXml = (xmlText: string, fileName: string, defaultCategory: AccountCategory): InvoiceItem | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const getTag = (tags: string[]): string => {
      for (const t of tags) {
        const el = doc.getElementsByTagName(t)[0];
        if (el && el.textContent) return el.textContent.trim();
      }
      return '';
    };

    const number = getTag(['nNF', 'nDFSe', 'Numero', 'NumeroNfse']);
    const emitNode = doc.getElementsByTagName('emit')[0] || doc.getElementsByTagName('PrestadorServico')[0] || doc.getElementsByTagName('prest')[0];
    let supplier = '';
    if (emitNode) {
      const xNome = emitNode.getElementsByTagName('xNome')[0] || emitNode.getElementsByTagName('RazaoSocial')[0];
      if (xNome?.textContent) supplier = xNome.textContent.trim();
    }
    if (!supplier) supplier = getTag(['xNome', 'RazaoSocial']);

    const rawVal = getTag(['vNF', 'vLiq', 'ValorLiquidoNfse', 'ValorServicos', 'vProd']);
    const amount = rawVal ? parseFloat(rawVal.replace(',', '.')) : 0;
    if (!amount || isNaN(amount) || amount <= 0) return null;

    const rawDate = getTag(['dhEmi', 'dEmi', 'DataEmissao']);
    const date = rawDate ? rawDate.slice(0, 10) : new Date().toISOString().split('T')[0];

    const descParts = [number ? `NF ${number}` : fileName.replace(/\.xml$/i, ''), supplier].filter(Boolean);

    return {
      id: `nf-xml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: defaultCategory,
      amount,
      number: number || undefined,
      supplier: supplier || undefined,
      description: descParts.join(' — '),
      date
    };
  } catch {
    return null;
  }
};

export const ComparativoExtratos: React.FC<ComparativoExtratosProps> = ({
  currentInstitution,
  currentUser
}) => {
  const currentOperationalMonth = useMemo(() => getCurrentMonthId(), []);
  const instId = currentInstitution?.id || 'default';
  const storageKey = `fin_monthly_history_${instId}`;

  // Competência começa automaticamente no mês atual em que está fazendo a operação
  const [selectedMonth, setSelectedMonth] = useState<string>(currentOperationalMonth);
  const [viewSubTab, setViewSubTab] = useState<'extratos' | 'notas' | 'contas' | 'comparativo'>('extratos');

  // Histórico completo de competências salvas (carregado instantaneamente do cache e sincronizado com Supabase)
  const [monthlyHistory, setMonthlyHistory] = useState<Record<string, MonthlyRecord>>(() => {
    const rawScoped = localStorage.getItem(`fin_monthly_history_${currentInstitution?.id || 'default'}`);
    const rawLegacy = localStorage.getItem('fin_monthly_history');
    const source = rawScoped || rawLegacy;
    if (source) {
      try {
        const parsed = JSON.parse(source) as Record<string, RawMonthlyInput>;
        const normalized: Record<string, MonthlyRecord> = {};
        Object.entries(parsed).forEach(([mId, rec]) => {
          if (/^\d{4}-\d{2}$/.test(mId) && rec) {
            normalized[mId] = normalizeMonthlyRecord(mId, rec);
          }
        });
        return normalized;
      } catch {
        return {};
      }
    }
    return {};
  });

  // Status de sincronização e salvamento permanente
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'local'>('local');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [expandedFileIds, setExpandedFileIds] = useState<Record<string, boolean>>({});
  const [showCustomMonthPicker, setShowCustomMonthPicker] = useState(false);

  // Filtros de consulta rápida para extratos e notas salvas
  const [fileCategoryFilter, setFileCategoryFilter] = useState<string>('TODAS');
  const [fileSearchTerm, setFileSearchTerm] = useState<string>('');
  const [invoiceCategoryFilter, setInvoiceCategoryFilter] = useState<string>('TODAS');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState<string>('');

  // Seletores do Comparador Direto (Competência A vs Competência B)
  const [compareMonthA, setCompareMonthA] = useState<string>('');
  const [compareMonthB, setCompareMonthB] = useState<string>(currentOperationalMonth);

  // Modais de Cadastro e Edição
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);
  const [showAddManualFileModal, setShowAddManualFileModal] = useState(false);

  const [newInvoice, setNewInvoice] = useState<{
    category: AccountCategory;
    amount: string;
    number: string;
    supplier: string;
    date: string;
  }>({
    category: 'Movimento',
    amount: '',
    number: '',
    supplier: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newManualFile, setNewManualFile] = useState({
    title: '',
    amount: '',
    category: 'Movimento' as AccountCategory,
    description: ''
  });

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Persiste um registro mensal no Supabase em background
  const syncRecordToSupabase = useCallback(async (record: MonthlyRecord) => {
    setSyncStatus('saving');
    try {
      const { error } = await supabase
        .from('fin_competencia_registros')
        .upsert(
          {
            institution_id: instId,
            month_id: record.monthId,
            month_label: record.monthLabel,
            files: record.files.map(({ isExpanded, ...rest }) => rest),
            invoices: record.invoices,
            notes: record.notes || null,
            updated_by: currentUser?.id || currentUser?.email || null,
            saved_at: record.savedAt
          },
          { onConflict: 'institution_id,month_id' }
        );

      if (!isMountedRef.current) return;

      if (!error) {
        setSyncStatus('synced');
        setLastSavedTime(new Date(record.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      } else {
        setSyncStatus('local');
        setLastSavedTime(new Date(record.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      if (!isMountedRef.current) return;
      setSyncStatus('local');
      setLastSavedTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [instId, currentUser?.id, currentUser?.email]);

  // Carrega dados salvos do Supabase ao abrir / trocar de instituição e mescla com o histórico local sem perder nada
  useEffect(() => {
    let cancelled = false;

    const loadAndMerge = async () => {
      // 1. Carrega cache local da instituição
      let localMap: Record<string, MonthlyRecord> = {};
      const rawScoped = localStorage.getItem(storageKey);
      const rawLegacy = instId === 'default' ? localStorage.getItem('fin_monthly_history') : null;
      const rawSource = rawScoped || rawLegacy;

      if (rawSource) {
        try {
          const parsed = JSON.parse(rawSource) as Record<string, RawMonthlyInput>;
          Object.entries(parsed).forEach(([mId, rec]) => {
            if (/^\d{4}-\d{2}$/.test(mId) && rec) {
              localMap[mId] = normalizeMonthlyRecord(mId, rec);
            }
          });
        } catch {
          localMap = {};
        }
      }

      if (!cancelled && Object.keys(localMap).length > 0) {
        setMonthlyHistory(localMap);
      }

      // 2. Busca registros salvos no banco Supabase
      try {
        const { data, error } = await supabase
          .from('fin_competencia_registros')
          .select('month_id, month_label, files, invoices, notes, saved_at')
          .eq('institution_id', instId)
          .order('month_id', { ascending: true })
          .limit(120);

        if (cancelled) return;

        if (!error && Array.isArray(data)) {
          const merged: Record<string, MonthlyRecord> = { ...localMap };
          const remoteIds = new Set<string>();

          data.forEach(row => {
            const mId = row.month_id as string;
            if (!mId) return;
            remoteIds.add(mId);

            const remoteRec = normalizeMonthlyRecord(mId, {
              monthId: mId,
              monthLabel: row.month_label || formatMonthLabel(mId),
              files: row.files as ExtratoFile[],
              invoices: row.invoices as InvoiceItem[],
              notes: row.notes || undefined,
              savedAt: row.saved_at
            });

            const existingLocal = merged[mId];
            if (!existingLocal) {
              merged[mId] = remoteRec;
            } else {
              const localCount = existingLocal.files.length + existingLocal.invoices.length;
              const remoteCount = remoteRec.files.length + remoteRec.invoices.length;
              const remoteTime = new Date(remoteRec.savedAt).getTime() || 0;
              const localTime = new Date(existingLocal.savedAt).getTime() || 0;

              if (remoteTime >= localTime || (remoteCount > 0 && localCount === 0)) {
                merged[mId] = remoteRec;
              }
            }
          });

          setMonthlyHistory(merged);
          try {
            localStorage.setItem(storageKey, JSON.stringify(merged));
            localStorage.setItem('fin_monthly_history', JSON.stringify(merged));
          } catch {
            // quota fallback
          }
          setSyncStatus('synced');

          // Envia para a nuvem quaisquer competências locais que ainda não estavam no banco
          Object.values(merged).forEach(rec => {
            if (!remoteIds.has(rec.monthId) && (rec.files.length > 0 || rec.invoices.length > 0)) {
              void syncRecordToSupabase(rec);
            }
          });
        } else {
          setSyncStatus('local');
        }
      } catch {
        if (!cancelled) setSyncStatus('local');
      }
    };

    void loadAndMerge();
    return () => { cancelled = true; };
  }, [instId, storageKey, syncRecordToSupabase]);

  // Função central de atualização com Auto-Save imediato (Local + Nuvem)
  const commitMonthUpdate = useCallback((
    monthId: string,
    updater: (prevRecord: MonthlyRecord) => { files: ExtratoFile[]; invoices: InvoiceItem[]; notes?: string }
  ) => {
    setMonthlyHistory(prev => {
      const base = prev[monthId] || {
        monthId,
        monthLabel: formatMonthLabel(monthId),
        files: [],
        invoices: [],
        savedAt: new Date().toISOString()
      };

      const updatedFields = updater(base);
      const nextRecord: MonthlyRecord = {
        monthId,
        monthLabel: formatMonthLabel(monthId),
        files: updatedFields.files,
        invoices: updatedFields.invoices,
        notes: updatedFields.notes ?? base.notes,
        savedAt: new Date().toISOString()
      };

      const nextMap = {
        ...prev,
        [monthId]: nextRecord
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(nextMap));
        localStorage.setItem('fin_monthly_history', JSON.stringify(nextMap));
      } catch (err) {
        console.warn('Aviso ao gravar cache local de finanças:', err);
      }

      void syncRecordToSupabase(nextRecord);
      return nextMap;
    });
  }, [storageKey, syncRecordToSupabase]);

  // Dados derivados diretamente da competência selecionada (zero perda ao trocar de aba ou mês!)
  const currentFiles = useMemo(() => {
    return monthlyHistory[selectedMonth]?.files || [];
  }, [monthlyHistory, selectedMonth]);

  const currentInvoices = useMemo(() => {
    return monthlyHistory[selectedMonth]?.invoices || [];
  }, [monthlyHistory, selectedMonth]);

  // Competências que possuem arquivos/extratos ou notas salvas
  const savedNonEmptyMonthIds = useMemo(() => {
    return Object.keys(monthlyHistory)
      .filter(mId => {
        const rec = monthlyHistory[mId];
        return rec && (rec.files.length > 0 || rec.invoices.length > 0);
      })
      .sort();
  }, [monthlyHistory]);

  // Lista organizada de competências: começa no mês atual da operação (ou na primeira competência já salva no histórico) em diante
  const availableCompetencias = useMemo(() => {
    const earliestSaved = savedNonEmptyMonthIds.length > 0 ? savedNonEmptyMonthIds[0] : currentOperationalMonth;
    const startMonth = earliestSaved < currentOperationalMonth ? earliestSaved : currentOperationalMonth;
    const endMonth = addMonthsToId(currentOperationalMonth, 11);

    const setIds = new Set<string>();
    let cursor = startMonth;
    let guard = 0;
    while (cursor <= endMonth && guard < 48) {
      setIds.add(cursor);
      cursor = addMonthsToId(cursor, 1);
      guard++;
    }

    savedNonEmptyMonthIds.forEach(id => setIds.add(id));
    setIds.add(selectedMonth);
    setIds.add(currentOperationalMonth);

    return Array.from(setIds)
      .sort()
      .map(id => ({
        id,
        label: formatMonthLabel(id),
        isCurrent: id === currentOperationalMonth,
        hasSavedData: savedNonEmptyMonthIds.includes(id)
      }));
  }, [savedNonEmptyMonthIds, currentOperationalMonth, selectedMonth]);

  // Atualiza automaticamente os meses sugeridos no Comparador Direto (Mês Anterior Salvo vs Mês Selecionado)
  useEffect(() => {
    setCompareMonthB(selectedMonth);
    const previousSaved = savedNonEmptyMonthIds.filter(m => m < selectedMonth);
    if (previousSaved.length > 0) {
      setCompareMonthA(previousSaved[previousSaved.length - 1]);
    } else {
      const otherSaved = savedNonEmptyMonthIds.filter(m => m !== selectedMonth);
      if (otherSaved.length > 0) {
        setCompareMonthA(otherSaved[0]);
      } else {
        setCompareMonthA(addMonthsToId(selectedMonth, -1));
      }
    }
  }, [selectedMonth, savedNonEmptyMonthIds]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const applyCurrencyMask = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v === '') return '';
    v = parseInt(v, 10).toString();
    if (v === 'NaN') v = '0';
    v = v.padStart(3, '0');
    const parteInteira = v.slice(0, -2);
    const parteDecimal = v.slice(-2);
    const parteInteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${parteInteiraFormatada},${parteDecimal}`;
  };

  // -------------------------------------------------------------
  // CÁLCULOS E TOTAIS DA COMPETÊNCIA SELECIONADA
  // -------------------------------------------------------------
  const totalFilesAmount = useMemo(() => {
    return currentFiles.reduce((acc, f) => acc + f.totalAmount, 0);
  }, [currentFiles]);

  const totalFilesLinesCount = useMemo(() => {
    return currentFiles.reduce((acc, f) => acc + f.lines.length, 0);
  }, [currentFiles]);

  const totalInvoicesAmount = useMemo(() => {
    return currentInvoices.reduce((acc, inv) => acc + inv.amount, 0);
  }, [currentInvoices]);

  const grandTotalMonth = useMemo(() => {
    return totalFilesAmount + totalInvoicesAmount;
  }, [totalFilesAmount, totalInvoicesAmount]);

  const accountCategoryTotals = useMemo(() => {
    const totals: Record<AccountCategory, { files: number; invoices: number; total: number; fileCount: number; invoiceCount: number }> = {
      'Movimento': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'FUS / Saúde': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'Educação': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'FUNDEB': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'Custeio': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'Complementar': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'Verbas Indenizatórias': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'Investimentos': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'Arrecadação / Próprios': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
      'Outros': { files: 0, invoices: 0, total: 0, fileCount: 0, invoiceCount: 0 },
    };

    currentFiles.forEach(f => {
      const cat = ACCOUNT_CATEGORIES.includes(f.category) ? f.category : 'Outros';
      totals[cat].files += f.totalAmount;
      totals[cat].total += f.totalAmount;
      totals[cat].fileCount += 1;
    });

    currentInvoices.forEach(inv => {
      const cat = ACCOUNT_CATEGORIES.includes(inv.category) ? inv.category : 'Outros';
      totals[cat].invoices += inv.amount;
      totals[cat].total += inv.amount;
      totals[cat].invoiceCount += 1;
    });

    return totals;
  }, [currentFiles, currentInvoices]);

  // -------------------------------------------------------------
  // DADOS COMPARATIVOS HISTÓRICOS & DIRETO (COMPETÊNCIA A vs B)
  // -------------------------------------------------------------
  const comparativeChartData = useMemo(() => {
    const monthsToDisplay = Array.from(new Set([...savedNonEmptyMonthIds, selectedMonth])).sort();

    return monthsToDisplay.map(mId => {
      const rec = monthlyHistory[mId];
      const files = rec?.files || [];
      const invoices = rec?.invoices || [];

      const fileTotal = files.reduce((acc, f) => acc + f.totalAmount, 0);
      const invoiceTotal = invoices.reduce((acc, inv) => acc + inv.amount, 0);
      const grandTotal = fileTotal + invoiceTotal;

      return {
        monthId: mId,
        monthName: formatShortMonthLabel(mId),
        fullName: formatMonthLabel(mId),
        'Extratos (R$)': fileTotal,
        'Notas Fiscais (R$)': invoiceTotal,
        'Total Geral (R$)': grandTotal,
      };
    });
  }, [monthlyHistory, savedNonEmptyMonthIds, selectedMonth]);

  const previousMonthComparison = useMemo(() => {
    const prevSavedList = savedNonEmptyMonthIds.filter(m => m < selectedMonth);
    const prevMonthId = prevSavedList.length > 0 ? prevSavedList[prevSavedList.length - 1] : null;

    if (!prevMonthId || !monthlyHistory[prevMonthId]) {
      return { hasPrev: false, diff: 0, percent: 0, prevTotal: 0, prevLabel: '', prevMonthId: '' };
    }

    const prevRecord = monthlyHistory[prevMonthId];
    const prevFileTot = prevRecord.files.reduce((a, b) => a + b.totalAmount, 0);
    const prevInvTot = prevRecord.invoices.reduce((a, b) => a + b.amount, 0);
    const prevGrand = prevFileTot + prevInvTot;

    const diff = grandTotalMonth - prevGrand;
    const percent = prevGrand > 0 ? (diff / prevGrand) * 100 : 0;

    return {
      hasPrev: true,
      diff,
      percent,
      prevTotal: prevGrand,
      prevLabel: formatMonthLabel(prevMonthId),
      prevMonthId
    };
  }, [monthlyHistory, savedNonEmptyMonthIds, selectedMonth, grandTotalMonth]);

  // Comparação direta entre quaisquer duas competências (compareMonthA vs compareMonthB)
  const directComparison = useMemo(() => {
    const recA = monthlyHistory[compareMonthA];
    const recB = monthlyHistory[compareMonthB];

    const filesA = recA?.files || [];
    const invsA = recA?.invoices || [];
    const filesB = recB?.files || [];
    const invsB = recB?.invoices || [];

    const totalFilesA = filesA.reduce((s, f) => s + f.totalAmount, 0);
    const totalInvsA = invsA.reduce((s, i) => s + i.amount, 0);
    const grandA = totalFilesA + totalInvsA;

    const totalFilesB = filesB.reduce((s, f) => s + f.totalAmount, 0);
    const totalInvsB = invsB.reduce((s, i) => s + i.amount, 0);
    const grandB = totalFilesB + totalInvsB;

    const rows = ACCOUNT_CATEGORIES.map(cat => {
      const fA = filesA.filter(f => f.category === cat).reduce((s, f) => s + f.totalAmount, 0);
      const iA = invsA.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0);
      const totA = fA + iA;

      const fB = filesB.filter(f => f.category === cat).reduce((s, f) => s + f.totalAmount, 0);
      const iB = invsB.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0);
      const totB = fB + iB;

      const diff = totB - totA;
      const pct = totA > 0 ? (diff / totA) * 100 : (totB > 0 ? 100 : 0);

      return { category: cat, fA, iA, totA, fB, iB, totB, diff, pct };
    });

    return {
      labelA: formatMonthLabel(compareMonthA),
      labelB: formatMonthLabel(compareMonthB),
      filesCountA: filesA.length,
      invsCountA: invsA.length,
      filesCountB: filesB.length,
      invsCountB: invsB.length,
      totalFilesA,
      totalInvsA,
      grandA,
      totalFilesB,
      totalInvsB,
      grandB,
      diffFiles: totalFilesB - totalFilesA,
      diffInvs: totalInvsB - totalInvsA,
      diffGrand: grandB - grandA,
      pctGrand: grandA > 0 ? ((grandB - grandA) / grandA) * 100 : 0,
      rows
    };
  }, [monthlyHistory, compareMonthA, compareMonthB]);

  // Filtros aplicados na visualização de Extratos e Notas Fiscais
  const filteredFiles = useMemo(() => {
    return currentFiles.filter(f => {
      if (fileCategoryFilter !== 'TODAS' && f.category !== fileCategoryFilter) return false;
      if (fileSearchTerm.trim()) {
        const q = fileSearchTerm.toLowerCase();
        const inName = f.fileName.toLowerCase().includes(q);
        const inLines = f.lines.some(l => l.account.toLowerCase().includes(q));
        return inName || inLines;
      }
      return true;
    });
  }, [currentFiles, fileCategoryFilter, fileSearchTerm]);

  const filteredInvoices = useMemo(() => {
    return currentInvoices.filter(inv => {
      if (invoiceCategoryFilter !== 'TODAS' && inv.category !== invoiceCategoryFilter) return false;
      if (invoiceSearchTerm.trim()) {
        const q = invoiceSearchTerm.toLowerCase();
        return (
          (inv.description || '').toLowerCase().includes(q) ||
          (inv.number || '').toLowerCase().includes(q) ||
          (inv.supplier || '').toLowerCase().includes(q) ||
          inv.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [currentInvoices, invoiceCategoryFilter, invoiceSearchTerm]);

  // -------------------------------------------------------------
  // AÇÕES DE EXTRATOS E NOTAS FISCAIS (TODAS COM AUTO-SAVE IMEDIATO)
  // -------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newExtratoFiles: ExtratoFile[] = [];

    for (const file of files) {
      const content = await file.text();
      const { lines, totalAmount, fileType, detectedCategory } = parseFinancialContent(content, file.name);

      if (lines.length > 0 || totalAmount > 0) {
        newExtratoFiles.push({
          id: `ext-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          fileName: file.name,
          fileType,
          totalAmount,
          category: detectedCategory,
          lines,
          uploadDate: new Date().toISOString().split('T')[0]
        });
      } else {
        showToast(`O arquivo "${file.name}" não continha valores numéricos reconhecíveis.`, 'warning');
      }
    }

    if (newExtratoFiles.length > 0) {
      commitMonthUpdate(selectedMonth, prev => ({
        files: [...prev.files, ...newExtratoFiles],
        invoices: prev.invoices
      }));
      showToast(
        `${newExtratoFiles.length} extrato(s) importado(s) e salvo(s) em ${formatMonthLabel(selectedMonth)}!`,
        'success'
      );
    }
    e.target.value = '';
  };

  const handleAddManualFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualFile.title || !newManualFile.amount) return;

    const parsedAmount = parseBRL(newManualFile.amount);
    if (parsedAmount <= 0) {
      showToast('Informe um valor válido maior que zero.', 'warning');
      return;
    }

    const newEntry: ExtratoFile = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fileName: newManualFile.title.trim(),
      fileType: 'Manual',
      totalAmount: parsedAmount,
      category: newManualFile.category,
      lines: [{
        id: '1',
        account: newManualFile.title.trim(),
        amount: parsedAmount,
        description: newManualFile.description.trim() || undefined,
        date: new Date().toLocaleDateString('pt-BR')
      }],
      uploadDate: new Date().toISOString().split('T')[0]
    };

    commitMonthUpdate(selectedMonth, prev => ({
      files: [...prev.files, newEntry],
      invoices: prev.invoices
    }));

    setShowAddManualFileModal(false);
    setNewManualFile({ title: '', amount: '', category: 'Movimento', description: '' });
    showToast(`Extrato salvo automaticamente em ${formatMonthLabel(selectedMonth)}!`, 'success');
  };

  const handleChangeFileCategory = (fileId: string, category: AccountCategory) => {
    commitMonthUpdate(selectedMonth, prev => ({
      files: prev.files.map(f => (f.id === fileId ? { ...f, category } : f)),
      invoices: prev.invoices
    }));
    showToast('Conta vinculada atualizada e salva!', 'success');
  };

  const handleDeleteFile = (id: string) => {
    commitMonthUpdate(selectedMonth, prev => ({
      files: prev.files.filter(f => f.id !== id),
      invoices: prev.invoices
    }));
    showToast('Extrato removido da competência.');
  };

  const handleDownloadSavedFile = (file: ExtratoFile) => {
    const header = 'Data;Favorecido / Descricao;Conta Vinculada;Valor (R$)\n';
    const body = file.lines
      .map(l => `${l.date || file.uploadDate};"${(l.account || '').replace(/"/g, '""')}";"${file.category}";${l.amount.toFixed(2).replace('.', ',')}`)
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = file.fileName.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBRL(newInvoice.amount);
    if (parsed <= 0) {
      showToast('Informe um valor válido para a nota fiscal.', 'warning');
      return;
    }

    const numClean = newInvoice.number.trim();
    const supClean = newInvoice.supplier.trim();
    const combinedDesc = [numClean ? `NF ${numClean.replace(/^nf\s*/i, '')}` : '', supClean]
      .filter(Boolean)
      .join(' — ');

    if (editingInvoice) {
      commitMonthUpdate(selectedMonth, prev => ({
        files: prev.files,
        invoices: prev.invoices.map(inv =>
          inv.id === editingInvoice.id
            ? {
                ...inv,
                category: newInvoice.category,
                amount: parsed,
                number: numClean || undefined,
                supplier: supClean || undefined,
                description: combinedDesc || undefined,
                date: newInvoice.date || inv.date
              }
            : inv
        )
      }));
      setEditingInvoice(null);
      setShowAddInvoiceModal(false);
      showToast('Nota fiscal atualizada e salva!', 'success');
    } else {
      const created: InvoiceItem = {
        id: `nf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        category: newInvoice.category || 'Movimento',
        amount: parsed,
        number: numClean || undefined,
        supplier: supClean || undefined,
        description: combinedDesc || undefined,
        date: newInvoice.date || new Date().toISOString().split('T')[0]
      };

      commitMonthUpdate(selectedMonth, prev => ({
        files: prev.files,
        invoices: [created, ...prev.invoices]
      }));
      setShowAddInvoiceModal(false);
      showToast(`Nota fiscal salva em ${formatMonthLabel(selectedMonth)}!`, 'success');
    }

    setNewInvoice(prev => ({
      category: prev.category,
      amount: '',
      number: '',
      supplier: '',
      date: new Date().toISOString().split('T')[0]
    }));
  };

  const handleXmlInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const imported: InvoiceItem[] = [];
    const defaultCat = invoiceCategoryFilter !== 'TODAS'
      ? (invoiceCategoryFilter as AccountCategory)
      : newInvoice.category;

    for (const file of files) {
      const text = await file.text();
      const parsed = parseInvoiceXml(text, file.name, defaultCat);
      if (parsed) {
        imported.push(parsed);
      } else {
        showToast(`Não foi possível extrair valor fiscal de "${file.name}".`, 'warning');
      }
    }

    if (imported.length > 0) {
      commitMonthUpdate(selectedMonth, prev => ({
        files: prev.files,
        invoices: [...imported, ...prev.invoices]
      }));
      showToast(`${imported.length} Nota(s) Fiscal(is) XML importada(s) e salva(s)!`, 'success');
    }

    e.target.value = '';
  };

  const handleOpenEditInvoice = (inv: InvoiceItem) => {
    setEditingInvoice(inv);
    setNewInvoice({
      category: inv.category,
      amount: applyCurrencyMask(Math.round(inv.amount * 100).toString()),
      number: inv.number || '',
      supplier: inv.supplier || inv.description || '',
      date: inv.date || new Date().toISOString().split('T')[0]
    });
    setShowAddInvoiceModal(true);
  };

  const handleDeleteInvoice = (id: string) => {
    commitMonthUpdate(selectedMonth, prev => ({
      files: prev.files,
      invoices: prev.invoices.filter(inv => inv.id !== id)
    }));
    showToast('Nota fiscal removida da competência.');
  };

  const handleManualForceSave = () => {
    commitMonthUpdate(selectedMonth, prev => ({
      files: prev.files,
      invoices: prev.invoices
    }));
    showToast(`Competência ${formatMonthLabel(selectedMonth)} confirmada e salva para comparativos!`, 'success');
  };

  const toggleFileExpand = (id: string) => {
    setExpandedFileIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeMonthLabel = formatMonthLabel(selectedMonth);
  const isCurrentOperationalSelected = selectedMonth === currentOperationalMonth;

  return (
    <>
      {/* ========================================================================= */}
      {/* DOCUMENTO EXCLUSIVO DE IMPRESSÃO OFICIAL                                  */}
      {/* ========================================================================= */}
      <div className="financial-report-print hidden print:block p-8 bg-white text-black font-['Inter'] leading-normal">
        <div className="border-b-2 border-black pb-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Landmark size={32} className="text-black" />
            <div>
              <h1 className="text-base font-black tracking-wider uppercase">
                {currentInstitution?.name || 'PREFEITURA MUNICIPAL'}
              </h1>
              <h2 className="text-sm font-bold uppercase text-neutral-800">
                SECRETARIA MUNICIPAL DE FINANÇAS — GESTÃO FISCAL & CONTÁBIL
              </h2>
            </div>
          </div>
          <div className="mt-3 bg-neutral-100 py-2 px-4 rounded border border-neutral-300 inline-block">
            <h3 className="text-xs font-black uppercase tracking-wider">
              DEMONSTRATIVO DE COMPETÊNCIA: EXTRATOS BANCÁRIOS, NOTAS FISCAIS & COMPARATIVO
            </h3>
          </div>
          <div className="flex justify-between items-center text-[10px] text-neutral-600 mt-2 px-2">
            <span><strong>Competência de Referência:</strong> {activeMonthLabel}</span>
            <span><strong>Emitido em:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-[11px] font-black uppercase tracking-wider mb-2 border-b border-neutral-300 pb-1">
            1. Resumo Executivo da Competência ({activeMonthLabel})
          </h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
              <span className="text-[9px] uppercase font-bold text-neutral-600 block">Total Geral Consolidado</span>
              <span className="text-sm font-black block mt-0.5">{formatCurrency(grandTotalMonth)}</span>
            </div>
            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
              <span className="text-[9px] uppercase font-bold text-neutral-600 block">Arquivos & Extratos ({currentFiles.length})</span>
              <span className="text-sm font-black block mt-0.5">{formatCurrency(totalFilesAmount)}</span>
            </div>
            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
              <span className="text-[9px] uppercase font-bold text-neutral-600 block">Notas Fiscais ({currentInvoices.length})</span>
              <span className="text-sm font-black block mt-0.5">{formatCurrency(totalInvoicesAmount)}</span>
            </div>
            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
              <span className="text-[9px] uppercase font-bold text-neutral-600 block">Variação vs Anterior</span>
              <span className="text-sm font-black block mt-0.5">
                {previousMonthComparison.hasPrev ? `${previousMonthComparison.diff > 0 ? '+' : ''}${previousMonthComparison.percent.toFixed(1)}%` : 'Competência Inicial'}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-[11px] font-black uppercase tracking-wider mb-2 border-b border-neutral-300 pb-1">
            2. Apuração Discriminada por Conta Bancária / Fonte de Recursos
          </h4>
          <table className="w-full text-left border-collapse border border-neutral-300 text-[10px]">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 font-black uppercase">
                <th className="py-2 px-3 border-r border-neutral-300">Conta / Destinação</th>
                <th className="py-2 px-3 text-right border-r border-neutral-300">Valor Extratos (R$)</th>
                <th className="py-2 px-3 text-right border-r border-neutral-300">Notas Fiscais (R$)</th>
                <th className="py-2 px-3 text-right border-r border-neutral-300">Total Apurado (R$)</th>
                <th className="py-2 px-3 text-right">% do Total</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNT_CATEGORIES.map(cat => {
                const data = accountCategoryTotals[cat];
                if (data.total === 0) return null;
                const perc = grandTotalMonth > 0 ? (data.total / grandTotalMonth) * 100 : 0;
                return (
                  <tr key={cat} className="border-b border-neutral-200">
                    <td className="py-1.5 px-3 font-bold border-r border-neutral-200">{cat}</td>
                    <td className="py-1.5 px-3 text-right border-r border-neutral-200">{formatCurrency(data.files)}</td>
                    <td className="py-1.5 px-3 text-right border-r border-neutral-200">{formatCurrency(data.invoices)}</td>
                    <td className="py-1.5 px-3 text-right font-black border-r border-neutral-200">{formatCurrency(data.total)}</td>
                    <td className="py-1.5 px-3 text-right font-medium">{perc.toFixed(1)}%</td>
                  </tr>
                );
              })}
              <tr className="bg-neutral-100 font-black border-t-2 border-black">
                <td className="py-2 px-3 border-r border-neutral-300">TOTAL GERAL CONSOLIDADO</td>
                <td className="py-2 px-3 text-right border-r border-neutral-300">{formatCurrency(totalFilesAmount)}</td>
                <td className="py-2 px-3 text-right border-r border-neutral-300">{formatCurrency(totalInvoicesAmount)}</td>
                <td className="py-2 px-3 text-right border-r border-neutral-300">{formatCurrency(grandTotalMonth)}</td>
                <td className="py-2 px-3 text-right">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h4 className="text-[11px] font-black uppercase tracking-wider mb-2 border-b border-neutral-300 pb-1">
            3. Histórico Comparativo entre Competências Salvas
          </h4>
          <table className="w-full text-left border-collapse border border-neutral-300 text-[10px]">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 font-black uppercase">
                <th className="py-2 px-3 border-r border-neutral-300">Conta / Categoria</th>
                {comparativeChartData.map(m => (
                  <th key={m.monthId} className="py-2 px-3 text-right border-r border-neutral-300">
                    {m.fullName}
                  </th>
                ))}
                <th className="py-2 px-3 text-right">Variação (%)</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNT_CATEGORIES.map(cat => {
                const valuesPerMonth = comparativeChartData.map(m => {
                  const rec = monthlyHistory[m.monthId];
                  const files = rec?.files || [];
                  const invs = rec?.invoices || [];
                  const fTot = files.filter(f => f.category === cat).reduce((a, b) => a + b.totalAmount, 0);
                  const iTot = invs.filter(inv => inv.category === cat).reduce((a, b) => a + b.amount, 0);
                  return fTot + iTot;
                });

                const hasAny = valuesPerMonth.some(v => v > 0);
                if (!hasAny) return null;

                const lastVal = valuesPerMonth[valuesPerMonth.length - 1];
                const prevVal = valuesPerMonth.length > 1 ? valuesPerMonth[valuesPerMonth.length - 2] : 0;
                const diff = lastVal - prevVal;
                const percent = prevVal > 0 ? (diff / prevVal) * 100 : 0;

                return (
                  <tr key={cat} className="border-b border-neutral-200">
                    <td className="py-1.5 px-3 font-bold border-r border-neutral-200">{cat}</td>
                    {valuesPerMonth.map((val, idx) => (
                      <td key={idx} className="py-1.5 px-3 text-right border-r border-neutral-200">
                        {formatCurrency(val)}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-black">
                      {prevVal > 0 ? `${diff > 0 ? '+' : ''}${percent.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-neutral-100 font-black border-t-2 border-black">
                <td className="py-2 px-3 border-r border-neutral-300">TOTAL GERAL CONSOLIDADO</td>
                {comparativeChartData.map(m => (
                  <td key={m.monthId} className="py-2 px-3 text-right border-r border-neutral-300 font-black">
                    {formatCurrency(m['Total Geral (R$)'])}
                  </td>
                ))}
                <td className="py-2 px-3 text-right font-black">
                  {previousMonthComparison.hasPrev ? `${previousMonthComparison.diff > 0 ? '+' : ''}${previousMonthComparison.percent.toFixed(1)}%` : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs page-break-inside-avoid" data-signature-block="true">
          <div>
            <div className="border-t border-black pt-1.5 mx-auto max-w-[280px]">
              <p className="font-black uppercase">Secretário(a) Municipal de Finanças</p>
              <p className="text-[10px] text-neutral-600">{currentInstitution?.name || 'Administração Municipal'}</p>
            </div>
          </div>
          <div>
            <div className="border-t border-black pt-1.5 mx-auto max-w-[280px]">
              <p className="font-black uppercase">Contador(a) Geral / Responsável Técnico</p>
              <p className="text-[10px] text-neutral-600">Contabilidade Pública Municipal</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERFACE PRINCIPAL ORGANIZADA EM TELA                                    */}
      {/* ========================================================================= */}
      <div className="financial-report-screen space-y-6 animate-in fade-in duration-300 font-['Inter'] print:hidden">

        {/* 1. BARRA DE COMPETÊNCIA ATIVA + STATUS DE SALVAMENTO AUTOMÁTICO */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Competência em Operação
                  </span>
                  {isCurrentOperationalSelected && (
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-[10px] font-black uppercase">
                      Mês Atual
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(prev => addMonthsToId(prev, -1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Competência anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableCompetencias.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label}{m.isCurrent ? ' (Mês Atual)' : ''}{m.hasSavedData ? ' • Salvo' : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setSelectedMonth(prev => addMonthsToId(prev, 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Próxima competência"
                  >
                    <ChevronRight size={16} />
                  </button>

                  {!isCurrentOperationalSelected && (
                    <button
                      type="button"
                      onClick={() => setSelectedMonth(currentOperationalMonth)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-[11px] font-bold transition-colors"
                    >
                      Ir para Mês Atual ({formatShortMonthLabel(currentOperationalMonth)})
                    </button>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCustomMonthPicker(v => !v)}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-[11px] font-semibold transition-colors"
                      title="Abrir qualquer competência específica (mês/ano)"
                    >
                      Outra data...
                    </button>
                    {showCustomMonthPicker && (
                      <div className="absolute left-0 top-10 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3 flex items-center gap-2">
                        <input
                          type="month"
                          value={selectedMonth}
                          onChange={e => {
                            if (e.target.value) {
                              setSelectedMonth(e.target.value);
                              setShowCustomMonthPicker(false);
                            }
                          }}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCustomMonthPicker(false)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Indicador de Salvamento Permanente + Ações */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 text-xs">
                {syncStatus === 'saving' ? (
                  <>
                    <RefreshCw size={14} className="text-indigo-500 animate-spin" />
                    <span className="font-bold text-slate-600 dark:text-slate-300">Salvando dados...</span>
                  </>
                ) : syncStatus === 'synced' ? (
                  <>
                    <Cloud size={14} className="text-emerald-500" />
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      Salvo na nuvem{lastSavedTime ? ` às ${lastSavedTime}` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <HardDrive size={14} className="text-emerald-500" />
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      Salvo automaticamente{lastSavedTime ? ` às ${lastSavedTime}` : ''}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleManualForceSave}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
                title="Garantir gravação imediata desta competência no histórico comparativo"
              >
                <Save size={14} /> Salvar Competência
              </button>

              <button
                type="button"
                onClick={() => setViewSubTab('comparativo')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                <ArrowLeftRight size={14} /> Comparar Meses
              </button>
            </div>
          </div>

          {/* Linha do Tempo Rápida das Competências que já possuem Extratos ou Notas Salvas */}
          {savedNonEmptyMonthIds.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                Competências Salvas ({savedNonEmptyMonthIds.length}):
              </span>
              {savedNonEmptyMonthIds.map(mId => {
                const rec = monthlyHistory[mId];
                const tot = (rec?.files.reduce((a, b) => a + b.totalAmount, 0) || 0) + (rec?.invoices.reduce((a, b) => a + b.amount, 0) || 0);
                const isSel = mId === selectedMonth;
                return (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => setSelectedMonth(mId)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                      isSel
                        ? 'bg-indigo-600 text-white border-indigo-600 font-black shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 font-semibold'
                    }`}
                  >
                    <CheckCircle2 size={12} className={isSel ? 'text-emerald-300' : 'text-emerald-500'} />
                    <span>{formatShortMonthLabel(mId)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSel ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {rec.files.length} ext • {rec.invoices.length} NF • {formatCurrency(tot)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. QUATRO CARDS EXECUTIVOS REAIS DA COMPETÊNCIA ATUAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Total Consolidado */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">
                Total em {formatShortMonthLabel(selectedMonth)}
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40">
                <Wallet size={18} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-['Montserrat'] text-slate-900 dark:text-white">
                {formatCurrency(grandTotalMonth)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Extratos + Notas Fiscais consolidadas
              </p>
            </div>
          </div>

          {/* Card 2: Arquivos & Extratos Salvos */}
          <div
            onClick={() => setViewSubTab('extratos')}
            className="cursor-pointer bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">
                Arquivos & Extratos
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
                <FileSpreadsheet size={18} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-['Montserrat'] text-blue-600 dark:text-sky-400">
                {formatCurrency(totalFilesAmount)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {currentFiles.length} arquivo(s) • {totalFilesLinesCount} lançamento(s) salvos
              </p>
            </div>
          </div>

          {/* Card 3: Notas Fiscais Salvas */}
          <div
            onClick={() => setViewSubTab('notas')}
            className="cursor-pointer bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">
                Notas Fiscais Salvas
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800/40">
                <Receipt size={18} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-['Montserrat'] text-amber-600 dark:text-amber-400">
                {formatCurrency(totalInvoicesAmount)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {currentInvoices.length} nota(s) fiscal(is) vinculada(s)
              </p>
            </div>
          </div>

          {/* Card 4: Variação vs Competência Anterior */}
          <div
            onClick={() => setViewSubTab('comparativo')}
            className="cursor-pointer bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">
                Comparativo Mensal
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                previousMonthComparison.hasPrev && previousMonthComparison.diff > 0
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/40'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/40'
              }`}>
                {previousMonthComparison.hasPrev && previousMonthComparison.diff > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
            </div>
            <div className="mt-3">
              {previousMonthComparison.hasPrev ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-black font-['Montserrat'] ${
                      previousMonthComparison.diff > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {previousMonthComparison.diff > 0 ? '+' : ''}{previousMonthComparison.percent.toFixed(1)}%
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      previousMonthComparison.diff > 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {previousMonthComparison.diff > 0 ? 'Aumento' : 'Redução'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {previousMonthComparison.diff > 0 ? '+' : ''}{formatCurrency(previousMonthComparison.diff)} vs {previousMonthComparison.prevLabel}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200">Competência Base</p>
                  <p className="text-[11px] text-slate-500 mt-1">Salve os próximos meses para comparar</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. PAINEL CENTRAL ORGANIZADO EM 4 ABAS DE OPERAÇÃO */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          
          {/* Navegação das Sub-Abas */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setViewSubTab('extratos')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                  viewSubTab === 'extratos'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <FileSpreadsheet size={16} />
                <span>Arquivos & Extratos ({currentFiles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewSubTab('notas')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                  viewSubTab === 'notas'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Receipt size={16} />
                <span>Notas Fiscais ({currentInvoices.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewSubTab('contas')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                  viewSubTab === 'contas'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Layers size={16} />
                <span>Resumo por Conta ({ACCOUNT_CATEGORIES.filter(c => accountCategoryTotals[c].total > 0).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewSubTab('comparativo')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                  viewSubTab === 'comparativo'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 size={16} />
                <span>Comparativo de Meses</span>
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8">

            {/* ========================================================= */}
            {/* ABA 1: ARQUIVOS & EXTRATOS SALVOS                         */}
            {/* ========================================================= */}
            {viewSubTab === 'extratos' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white font-['Montserrat']">
                      Arquivos & Extratos Bancários — {activeMonthLabel}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Todos os extratos importados (.txt, .csv, .ofx, CNAB 240/400) ficam salvos automaticamente nesta competência para consulta e comparação futura.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowAddManualFileModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Plus size={15} /> Lançamento Manual
                    </button>

                    <label className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95">
                      <Upload size={15} /> Importar Extratos (.txt / .csv / .ofx / CNAB)
                      <input type="file" accept=".txt,.csv,.ofx,.ret,.rem" multiple onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Barra de Filtro dos Extratos Salvos */}
                {currentFiles.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nome do arquivo ou favorecido dentro do extrato..."
                        value={fileSearchTerm}
                        onChange={e => setFileSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <select
                      value={fileCategoryFilter}
                      onChange={e => setFileCategoryFilter(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                    >
                      <option value="TODAS">Todas as Contas ({currentFiles.length})</option>
                      {ACCOUNT_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {currentFiles.length === 0 ? (
                  <div className="text-center py-14 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30">
                    <FileSpreadsheet size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      Nenhum extrato salvo em {activeMonthLabel}
                    </h5>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
                      Importe arquivos bancários (.txt, CNAB 240/400, .ofx ou .csv) ou registre manualmente. Tudo fica salvo permanentemente nesta competência.
                    </p>
                    <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md">
                      <Upload size={16} /> Selecionar Arquivos de Extrato
                      <input type="file" accept=".txt,.csv,.ofx,.ret,.rem" multiple onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500">
                    Nenhum arquivo corresponde ao filtro aplicado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredFiles.map(file => {
                      const isExpanded = !!expandedFileIds[file.id];
                      return (
                        <div 
                          key={file.id} 
                          className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/40 dark:bg-slate-900/30 transition-all"
                        >
                          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">
                                <FileSpreadsheet size={22} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-black text-sm text-slate-900 dark:text-white">{file.fileName}</h5>
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded">
                                    {file.fileType}
                                  </span>
                                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded">
                                    Salvo em {new Date(file.uploadDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-slate-400">Conta:</span>
                                  <select
                                    value={file.category}
                                    onChange={e => handleChangeFileCategory(file.id, e.target.value as AccountCategory)}
                                    className="text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 text-indigo-700 dark:text-indigo-300 border-none outline-none cursor-pointer"
                                  >
                                    {ACCOUNT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-[11px] text-slate-500">{file.lines.length} lançamento(s) discriminado(s)</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-5 justify-between md:justify-end">
                              <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total do Extrato</span>
                                <span className="text-xl font-black font-['Montserrat'] text-indigo-600 dark:text-indigo-400">
                                  {formatCurrency(file.totalAmount)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-4">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSavedFile(file)}
                                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                  title="Baixar planilha CSV deste extrato salvo"
                                >
                                  <Download size={17} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleFileExpand(file.id)}
                                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                  title={isExpanded ? 'Ocultar lançamentos' : 'Ver lançamentos salvos'}
                                >
                                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                                  title="Remover extrato desta competência"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
                              <div className="max-h-64 overflow-y-auto pr-2">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                      <th className="py-2 px-3">Data</th>
                                      <th className="py-2 px-3">Favorecido / Descrição</th>
                                      <th className="py-2 px-3 text-right">Valor</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {file.lines.map((l, i) => (
                                      <tr key={l.id || i} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{l.date || '-'}</td>
                                        <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{l.account}</td>
                                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(l.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 2: NOTAS FISCAIS SALVAS                               */}
            {/* ========================================================= */}
            {viewSubTab === 'notas' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white font-['Montserrat']">
                      Notas Fiscais da Competência — {activeMonthLabel}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Todas as notas fiscais lançadas ou importadas via XML ficam salvas permanentemente por competência e conta bancária.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      <FileCode2 size={15} className="text-amber-600 dark:text-amber-400" />
                      <span>Importar XML (NF-e / NFS-e)</span>
                      <input type="file" accept=".xml" multiple onChange={handleXmlInvoiceUpload} className="hidden" />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingInvoice(null);
                        setNewInvoice({
                          category: 'Movimento',
                          amount: '',
                          number: '',
                          supplier: '',
                          date: new Date().toISOString().split('T')[0]
                        });
                        setShowAddInvoiceModal(true);
                      }}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                    >
                      <Plus size={15} /> Nova Nota Fiscal
                    </button>
                  </div>
                </div>

                {/* BARRA DE LANÇAMENTO RÁPIDO EM LINHA (COM AUTO-SAVE) */}
                <form 
                  onSubmit={handleAddInvoiceSubmit} 
                  className="bg-amber-50/40 dark:bg-slate-950/60 p-4 rounded-2xl border border-amber-200/70 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
                >
                  <div className="lg:col-span-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Conta Vinculada</label>
                    <select
                      value={newInvoice.category}
                      onChange={e => setNewInvoice({ ...newInvoice, category: e.target.value as AccountCategory })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {ACCOUNT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Nº da Nota</label>
                    <input
                      type="text"
                      placeholder="Ex: 1042"
                      value={newInvoice.number}
                      onChange={e => setNewInvoice({ ...newInvoice, number: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Fornecedor / Descrição</label>
                    <input
                      type="text"
                      placeholder="Fornecedor ou objeto da nota"
                      value={newInvoice.supplier}
                      onChange={e => setNewInvoice({ ...newInvoice, supplier: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Valor (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                      <input
                        required
                        type="text"
                        placeholder="0,00"
                        value={newInvoice.amount}
                        onChange={e => setNewInvoice({ ...newInvoice, amount: applyCurrencyMask(e.target.value) })}
                        className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black font-['Montserrat'] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={15} /> Salvar Nota
                    </button>
                  </div>
                </form>

                {/* Filtro de Notas Fiscais Salvas */}
                {currentInvoices.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtrar notas por número, fornecedor ou conta..."
                        value={invoiceSearchTerm}
                        onChange={e => setInvoiceSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={invoiceCategoryFilter}
                        onChange={e => setInvoiceCategoryFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                      >
                        <option value="TODAS">Todas as Contas ({currentInvoices.length})</option>
                        {ACCOUNT_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400 whitespace-nowrap px-2">
                        Subtotal: {formatCurrency(filteredInvoices.reduce((s, i) => s + i.amount, 0))}
                      </span>
                    </div>
                  </div>
                )}

                {currentInvoices.length === 0 ? (
                  <div className="text-center py-14 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30">
                    <Receipt size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      Nenhuma nota fiscal salva em {activeMonthLabel}
                    </h5>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Utilize o formulário rápido acima ou importe arquivos XML de NF-e/NFS-e para manter o histórico fiscal salvo nesta competência.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-4">Conta Vinculada</th>
                          <th className="py-3 px-4">Nº / Identificação</th>
                          <th className="py-3 px-4">Data</th>
                          <th className="py-3 px-4 text-right">Valor da Nota</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-xs transition-colors">
                            <td className="py-3.5 px-4 font-black">
                              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-lg text-[11px] font-black uppercase">
                                {inv.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200 font-medium">
                              {inv.description || [inv.number ? `NF ${inv.number}` : '', inv.supplier].filter(Boolean).join(' — ') || (
                                <span className="text-slate-400 italic">Nota Fiscal Lançada</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-500 whitespace-nowrap">
                              {inv.date ? new Date(inv.date.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black font-['Montserrat'] text-sm text-slate-900 dark:text-white whitespace-nowrap">
                              {formatCurrency(inv.amount)}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditInvoice(inv)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Editar Nota Fiscal"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                  title="Excluir Nota Fiscal"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 3: APURAÇÃO POR CONTA BANCÁRIA NA COMPETÊNCIA         */}
            {/* ========================================================= */}
            {viewSubTab === 'contas' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white font-['Montserrat']">
                      Apuração por Conta Bancária & Fonte de Recursos — {activeMonthLabel}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Cruzamento direto entre Arquivos/Extratos e Notas Fiscais salvas em cada conta municipal.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold w-fit">
                    {ACCOUNT_CATEGORIES.filter(c => accountCategoryTotals[c].total > 0).length} conta(s) com saldo apurado
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ACCOUNT_CATEGORIES.map(cat => {
                    const data = accountCategoryTotals[cat];
                    const hasValue = data.total > 0;
                    const percentOfGrand = grandTotalMonth > 0 ? (data.total / grandTotalMonth) * 100 : 0;
                    const filesRatio = data.total > 0 ? (data.files / data.total) * 100 : 0;

                    return (
                      <div 
                        key={cat}
                        className={`p-5 rounded-3xl border transition-all ${
                          hasValue 
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300' 
                            : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            {cat}
                          </span>
                          {hasValue && (
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                              {percentOfGrand.toFixed(1)}% do mês
                            </span>
                          )}
                        </div>

                        <p className="text-xl font-black font-['Montserrat'] text-slate-900 dark:text-white mt-2">
                          {formatCurrency(data.total)}
                        </p>

                        {hasValue && (
                          <div className="mt-3 h-1.5 w-full bg-amber-500/30 rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-500" 
                              style={{ width: `${filesRatio}%` }} 
                              title={`Extratos: ${filesRatio.toFixed(0)}%`}
                            />
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 uppercase font-semibold block text-[9px]">
                              Extratos ({data.fileCount})
                            </span>
                            <span className="font-bold text-blue-600 dark:text-sky-400">{formatCurrency(data.files)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase font-semibold block text-[9px]">
                              Notas ({data.invoiceCount})
                            </span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(data.invoices)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 4: COMPARATIVO ENTRE COMPETÊNCIAS SALVAS              */}
            {/* ========================================================= */}
            {viewSubTab === 'comparativo' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 font-['Montserrat']">
                      <Scale size={18} className="text-indigo-600 dark:text-indigo-400" />
                      Central de Comparação entre Competências Salvas
                    </h4>
                    <p className="text-xs text-slate-500">
                      Compare lado a lado quaisquer duas competências salvas (Extratos, Notas Fiscais e Total por Conta) ou acompanhe a evolução histórica.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 w-fit"
                  >
                    <Printer size={15} /> Imprimir Demonstrativo Oficial
                  </button>
                </div>

                {/* BLOCO A: COMPARADOR DIRETO LADO A LADO (COMPETÊNCIA A vs COMPETÊNCIA B) */}
                <div className="bg-slate-50/80 dark:bg-slate-950/50 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 md:p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        Comparação Direta sob Demanda
                      </span>
                      <h5 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        Selecione duas competências para comparar Extratos e Notas Fiscais
                      </h5>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={compareMonthA}
                        onChange={e => setCompareMonthA(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                      >
                        {availableCompetencias.map(m => (
                          <option key={m.id} value={m.id}>
                            Base: {m.label}{m.hasSavedData ? ' (Salvo)' : ''}
                          </option>
                        ))}
                      </select>

                      <ArrowLeftRight size={16} className="text-slate-400" />

                      <select
                        value={compareMonthB}
                        onChange={e => setCompareMonthB(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 px-3.5 py-2 rounded-xl text-xs font-black text-indigo-700 dark:text-indigo-300 outline-none"
                      >
                        {availableCompetencias.map(m => (
                          <option key={m.id} value={m.id}>
                            Comparar: {m.label}{m.hasSavedData ? ' (Salvo)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resumo Lado a Lado A vs B */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-sky-400">
                        Arquivos & Extratos
                      </span>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400">{directComparison.labelA} ({directComparison.filesCountA})</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(directComparison.totalFilesA)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">{directComparison.labelB} ({directComparison.filesCountB})</p>
                          <p className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(directComparison.totalFilesB)}</p>
                        </div>
                      </div>
                      <p className={`text-[11px] font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 ${
                        directComparison.diffFiles > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Diferença: {directComparison.diffFiles > 0 ? '+' : ''}{formatCurrency(directComparison.diffFiles)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Notas Fiscais
                      </span>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400">{directComparison.labelA} ({directComparison.invsCountA})</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(directComparison.totalInvsA)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">{directComparison.labelB} ({directComparison.invsCountB})</p>
                          <p className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(directComparison.totalInvsB)}</p>
                        </div>
                      </div>
                      <p className={`text-[11px] font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 ${
                        directComparison.diffInvs > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Diferença: {directComparison.diffInvs > 0 ? '+' : ''}{formatCurrency(directComparison.diffInvs)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Total Consolidado
                      </span>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400">{directComparison.labelA}</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(directComparison.grandA)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">{directComparison.labelB}</p>
                          <p className="text-base font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(directComparison.grandB)}</p>
                        </div>
                      </div>
                      <p className={`text-[11px] font-black mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 ${
                        directComparison.diffGrand > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Variação: {directComparison.diffGrand > 0 ? '+' : ''}{formatCurrency(directComparison.diffGrand)} ({directComparison.diffGrand > 0 ? '+' : ''}{directComparison.pctGrand.toFixed(1)}%)
                      </p>
                    </div>
                  </div>

                  {/* Tabela Detalhada Conta por Conta (Mês A vs Mês B) */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-4">Conta Bancária</th>
                          <th className="py-3 px-4 text-right">{directComparison.labelA} (Extratos / NF)</th>
                          <th className="py-3 px-4 text-right">{directComparison.labelA} Total</th>
                          <th className="py-3 px-4 text-right">{directComparison.labelB} (Extratos / NF)</th>
                          <th className="py-3 px-4 text-right">{directComparison.labelB} Total</th>
                          <th className="py-3 px-4 text-right">Diferença</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {directComparison.rows.filter(r => r.totA > 0 || r.totB > 0).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              Nenhum lançamento registrado nas duas competências selecionadas para comparação.
                            </td>
                          </tr>
                        ) : (
                          directComparison.rows
                            .filter(r => r.totA > 0 || r.totB > 0)
                            .map(r => (
                              <tr key={r.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.category}</td>
                                <td className="py-3 px-4 text-right text-[11px] text-slate-500">
                                  {formatCurrency(r.fA)} / {formatCurrency(r.iA)}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                                  {formatCurrency(r.totA)}
                                </td>
                                <td className="py-3 px-4 text-right text-[11px] text-slate-500">
                                  {formatCurrency(r.fB)} / {formatCurrency(r.iB)}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                                  {formatCurrency(r.totB)}
                                </td>
                                <td className="py-3 px-4 text-right font-black whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] ${
                                    r.diff > 0
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                      : r.diff < 0
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}>
                                    {r.diff > 0 ? '+' : ''}{formatCurrency(r.diff)}
                                  </span>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BLOCO B: GRÁFICO EVOLUTIVO DE TODAS AS COMPETÊNCIAS SALVAS */}
                <div className="bg-slate-50/70 dark:bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <div className="mb-6">
                    <h5 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white font-['Montserrat']">
                      Evolução Histórica Consolidada (Competências Salvas)
                    </h5>
                    <p className="text-xs text-slate-500">
                      Comparativo visual contínuo entre Extratos Bancários, Notas Fiscais e Total Geral de cada mês salvo.
                    </p>
                  </div>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={comparativeChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.12} />
                        <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fill: '#888', fontSize: 11 }} />
                        <Tooltip 
                          formatter={(val: number) => formatCurrency(val)} 
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.2)',
                            backgroundColor: '#0f172a',
                            color: '#ffffff'
                          }} 
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '12px' }} />
                        <Bar dataKey="Extratos (R$)" fill="#3b82f6" radius={[8, 8, 0, 0]} maxBarSize={42} />
                        <Bar dataKey="Notas Fiscais (R$)" fill="#f59e0b" radius={[8, 8, 0, 0]} maxBarSize={42} />
                        <Line 
                          type="monotone" 
                          dataKey="Total Geral (R$)" 
                          stroke="#10b981" 
                          strokeWidth={3.5} 
                          dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} 
                          activeDot={{ r: 7 }} 
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* BLOCO C: MATRIZ HISTÓRICA MÊS A MÊS */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 font-['Montserrat']">
                    Matriz Histórica Completa por Conta Bancária
                  </h5>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-4 font-black">Conta Bancária / Categoria</th>
                          {comparativeChartData.map(m => (
                            <th key={m.monthId} className="py-3 px-4 text-right font-black">
                              {m.fullName}
                            </th>
                          ))}
                          <th className="py-3 px-4 text-right font-black text-indigo-600 dark:text-indigo-400">Variação (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ACCOUNT_CATEGORIES.map(cat => {
                          const valuesPerMonth = comparativeChartData.map(m => {
                            const rec = monthlyHistory[m.monthId];
                            const files = rec?.files || [];
                            const invs = rec?.invoices || [];
                            const fTot = files.filter(f => f.category === cat).reduce((a, b) => a + b.totalAmount, 0);
                            const iTot = invs.filter(inv => inv.category === cat).reduce((a, b) => a + b.amount, 0);
                            return fTot + iTot;
                          });

                          const hasAny = valuesPerMonth.some(v => v > 0);
                          if (!hasAny) return null;

                          const lastVal = valuesPerMonth[valuesPerMonth.length - 1];
                          const prevVal = valuesPerMonth.length > 1 ? valuesPerMonth[valuesPerMonth.length - 2] : 0;
                          const diff = lastVal - prevVal;
                          const percent = prevVal > 0 ? (diff / prevVal) * 100 : 0;

                          return (
                            <tr key={cat} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                {cat}
                              </td>
                              {valuesPerMonth.map((val, idx) => (
                                <td key={idx} className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                                  {formatCurrency(val)}
                                </td>
                              ))}
                              <td className="py-3.5 px-4 text-right font-black">
                                {prevVal > 0 ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] ${
                                    diff > 0 
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' 
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  }`}>
                                    {diff > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                    {diff > 0 ? '+' : ''}{percent.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        <tr className="bg-slate-100/80 dark:bg-slate-800/60 font-black border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                          <td className="py-4 px-4 font-black">TOTAL GERAL CONSOLIDADO</td>
                          {comparativeChartData.map(m => (
                            <td key={m.monthId} className="py-4 px-4 text-right font-black font-['Montserrat']">
                              {formatCurrency(m['Total Geral (R$)'])}
                            </td>
                          ))}
                          <td className="py-4 px-4 text-right font-black">
                            {previousMonthComparison.hasPrev && (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] ${
                                previousMonthComparison.diff > 0 
                                  ? 'bg-rose-600 text-white' 
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {previousMonthComparison.diff > 0 ? '+' : ''}{previousMonthComparison.percent.toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* MODAL CADASTRAR / EDITAR NOTA FISCAL */}
        {showAddInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {editingInvoice ? 'Editar Nota Fiscal' : `Nova Nota Fiscal (${activeMonthLabel})`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Salva automaticamente na competência selecionada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddInvoiceModal(false); setEditingInvoice(null); }}
                  className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddInvoiceSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Conta Vinculada</label>
                  <select
                    value={newInvoice.category}
                    onChange={e => setNewInvoice({ ...newInvoice, category: e.target.value as AccountCategory })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {ACCOUNT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nº da Nota</label>
                    <input
                      type="text"
                      placeholder="Ex: 1042"
                      value={newInvoice.number}
                      onChange={e => setNewInvoice({ ...newInvoice, number: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Data de Emissão</label>
                    <input
                      type="date"
                      value={newInvoice.date}
                      onChange={e => setNewInvoice({ ...newInvoice, date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Valor da Nota (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                    <input
                      required
                      type="text"
                      placeholder="0,00"
                      value={newInvoice.amount}
                      onChange={e => setNewInvoice({ ...newInvoice, amount: applyCurrencyMask(e.target.value) })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black font-['Montserrat'] text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Fornecedor / Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Fornecedor ou objeto da despesa"
                    value={newInvoice.supplier}
                    onChange={e => setNewInvoice({ ...newInvoice, supplier: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddInvoiceModal(false); setEditingInvoice(null); }}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20"
                  >
                    {editingInvoice ? 'Salvar Alterações' : 'Salvar Nota'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL LANÇAMENTO MANUAL DE EXTRATO */}
        {showAddManualFileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Lançamento de Extrato ({activeMonthLabel})
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Adicione um extrato ou remessa manualmente na competência atual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddManualFileModal(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddManualFileSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Título / Identificação do Extrato</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Extrato Conta Movimento BB - 1ª Quinzena"
                    value={newManualFile.title}
                    onChange={e => setNewManualFile({ ...newManualFile, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Conta Vinculada</label>
                  <select
                    value={newManualFile.category}
                    onChange={e => setNewManualFile({ ...newManualFile, category: e.target.value as AccountCategory })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {ACCOUNT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Valor Total (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                    <input
                      required
                      type="text"
                      placeholder="0,00"
                      value={newManualFile.amount}
                      onChange={e => setNewManualFile({ ...newManualFile, amount: applyCurrencyMask(e.target.value) })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black font-['Montserrat'] text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddManualFileModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  >
                    Salvar Extrato
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
};
