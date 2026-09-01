import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, Upload, Plus, Trash2, Edit2, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, ArrowRight, CheckCircle2, AlertTriangle,
  Receipt, Wallet, Calendar, Save, RefreshCw, Download, Printer,
  Eye, Filter, Search, X, BarChart3, Scale, Layers, Check, Sparkles,
  FileText, ArrowUpRight, ArrowDownRight, DollarSign, PieChart, Landmark,
  Building2, UserCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Area 
} from 'recharts';
import { showToast } from '../../components/ui/Toast';

export type AccountCategory = 
  | 'Movimento' 
  | 'FUS / Saúde' 
  | 'Educação' 
  | 'FUNDEB' 
  | 'Custeio' 
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
  fileType: 'CNAB 240' | 'CNAB 400' | 'Extrato TXT' | 'CSV' | 'Manual';
  totalAmount: number;
  category: AccountCategory;
  lines: ExtratoLine[];
  isExpanded: boolean;
  uploadDate: string;
}

export interface InvoiceItem {
  id: string;
  category: AccountCategory; // Para qual conta ela representa
  amount: number; // Valor
  description?: string; // Identificação opcional
  date?: string; // Data
}

export interface MonthlyRecord {
  monthId: string; // Ex: '2026-09'
  monthLabel: string; // Ex: 'Setembro/2026'
  files: ExtratoFile[];
  invoices: InvoiceItem[];
  savedAt: string;
  notes?: string;
}

// Meses pré-configurados para navegação
const MONTH_OPTIONS = [
  { id: '2026-01', label: 'Janeiro/2026' },
  { id: '2026-02', label: 'Fevereiro/2026' },
  { id: '2026-03', label: 'Março/2026' },
  { id: '2026-04', label: 'Abril/2026' },
  { id: '2026-05', label: 'Maio/2026' },
  { id: '2026-06', label: 'Junho/2026' },
  { id: '2026-07', label: 'Julho/2026' },
  { id: '2026-08', label: 'Agosto/2026' },
  { id: '2026-09', label: 'Setembro/2026' },
  { id: '2026-10', label: 'Outubro/2026' },
  { id: '2026-11', label: 'Novembro/2026' },
  { id: '2026-12', label: 'Dezembro/2026' },
];

// =========================================================================
// PARSER INTELIGENTE DE ARQUIVOS FINANCEIROS (CNAB 240, CNAB 400, TXT, CSV)
// =========================================================================
export const parseFinancialContent = (content: string, fileName: string): { lines: ExtratoLine[]; totalAmount: number; fileType: ExtratoFile['fileType']; detectedCategory: AccountCategory } => {
  const rawLines = content.split(/\r?\n/);
  const parsedLines: ExtratoLine[] = [];
  let totalAmount = 0;
  let fileType: ExtratoFile['fileType'] = 'Extrato TXT';

  const isCnab240 = rawLines.some(l => l.length >= 238 && l.length <= 245);
  const isCnab400 = !isCnab240 && rawLines.some(l => l.length >= 398 && l.length <= 405);
  const isCsv = content.includes(';') || content.includes(',');

  if (isCnab240) {
    fileType = 'CNAB 240';
    rawLines.forEach((line, idx) => {
      if (line.length < 100) return;

      const recordType = line[7]; // 0=Header Arq, 1=Header Lote, 3=Detalhe, 5=Trailer Lote, 9=Trailer Arq
      const segmentType = line[13];

      // Apenas processar registros de Detalhe (Tipo 3) para NÃO DUPLICAR valores com Trailers
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
      if (lower.startsWith('data;') || lower.startsWith('data,') || lower.startsWith('data\t') || lower.includes('extrato de conta') || lower.includes('saldo anterior') || lower.includes('saldo final')) {
        return;
      }

      if (trimmed.includes(';') || trimmed.includes(',')) {
        const parts = trimmed.includes(';') ? trimmed.split(';') : trimmed.split(',');
        let foundAmount = 0;
        let foundDesc = '';

        for (const part of parts) {
          const p = part.trim().replace(/R\$\s*/gi, '');
          if (/^-?[\d\.]+(?:,\d{2})?\s*[DCdc]?$/.test(p) || /^-?\d+(?:\.\d{2})$/.test(p)) {
            const num = parseBRL(p);
            if (num > 0) foundAmount = num;
          } else if (p.length > 2 && !/^\d{2}\/\d{2}\/\d{2,4}$/.test(p)) {
            if (!foundDesc) foundDesc = p;
          }
        }

        if (foundAmount > 0) {
          parsedLines.push({
            id: `csv-${idx}`,
            account: foundDesc || `Lançamento Linha ${idx + 1}`,
            amount: foundAmount
          });
          totalAmount += foundAmount;
          return;
        }
      }

      // Máscara contra datas, CPFs e CNPJs para não capturar números cadastrais como valores
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
          desc = desc.replace(/R\$\s*/gi, '')
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
  if (nameLower.includes('movimento')) detectedCategory = 'Movimento';
  else if (nameLower.includes('fus') || nameLower.includes('saude') || nameLower.includes('saúde')) detectedCategory = 'FUS / Saúde';
  else if (nameLower.includes('educacao') || nameLower.includes('educação')) detectedCategory = 'Educação';
  else if (nameLower.includes('fundeb')) detectedCategory = 'FUNDEB';
  else if (nameLower.includes('custeio')) detectedCategory = 'Custeio';
  else if (nameLower.includes('verba') || nameLower.includes('indeniz')) detectedCategory = 'Verbas Indenizatórias';
  else if (nameLower.includes('invest') || nameLower.includes('obra')) detectedCategory = 'Investimentos';
  else if (nameLower.includes('proprio') || nameLower.includes('arrecada') || nameLower.includes('tributo')) detectedCategory = 'Arrecadação / Próprios';

  return { lines: parsedLines, totalAmount, fileType, detectedCategory };
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

export const ComparativoExtratos: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [viewSubTab, setViewSubTab] = useState<'extratos' | 'notas' | 'comparativo'>('extratos');

  // Histórico salvo de meses
  const [monthlyHistory, setMonthlyHistory] = useState<Record<string, MonthlyRecord>>(() => {
    const saved = localStorage.getItem('fin_monthly_history');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      '2026-07': {
        monthId: '2026-07',
        monthLabel: 'Julho/2026',
        files: [
          { id: 'f-jul-1', fileName: 'Extrato_Movimento_Jul.txt', fileType: 'Extrato TXT', totalAmount: 480000.00, category: 'Movimento', lines: [{ id: '1', account: 'Folha Pagamento', amount: 480000.00 }], isExpanded: false, uploadDate: '2026-07-31' },
          { id: 'f-jul-2', fileName: 'Extrato_Saude_FUS_Jul.txt', fileType: 'Extrato TXT', totalAmount: 310000.00, category: 'FUS / Saúde', lines: [{ id: '2', account: 'Medicamentos & Plantões', amount: 310000.00 }], isExpanded: false, uploadDate: '2026-07-31' },
          { id: 'f-jul-3', fileName: 'Extrato_Educacao_Jul.txt', fileType: 'Extrato TXT', totalAmount: 220000.00, category: 'Educação', lines: [{ id: '3', account: 'Merenda & Transporte', amount: 220000.00 }], isExpanded: false, uploadDate: '2026-07-31' },
          { id: 'f-jul-4', fileName: 'Extrato_FUNDEB_Jul.txt', fileType: 'Extrato TXT', totalAmount: 410000.00, category: 'FUNDEB', lines: [{ id: '4', account: 'Professores Efetivos', amount: 410000.00 }], isExpanded: false, uploadDate: '2026-07-31' },
        ],
        invoices: [
          { id: 'nf-jul-1', category: 'FUS / Saúde', amount: 85400.00, description: 'Nota Ref. Medicamentos', date: '2026-07-15' },
          { id: 'nf-jul-2', category: 'Educação', amount: 64200.00, description: 'Nota Ref. Merenda', date: '2026-07-18' },
        ],
        savedAt: '2026-07-31T18:00:00.000Z'
      },
      '2026-08': {
        monthId: '2026-08',
        monthLabel: 'Agosto/2026',
        files: [
          { id: 'f-ago-1', fileName: 'Extrato_Movimento_Ago.txt', fileType: 'Extrato TXT', totalAmount: 512000.00, category: 'Movimento', lines: [{ id: '1', account: 'Folha Pagamento', amount: 512000.00 }], isExpanded: false, uploadDate: '2026-08-31' },
          { id: 'f-ago-2', fileName: 'Extrato_Saude_FUS_Ago.txt', fileType: 'Extrato TXT', totalAmount: 345000.00, category: 'FUS / Saúde', lines: [{ id: '2', account: 'Medicamentos & Plantões', amount: 345000.00 }], isExpanded: false, uploadDate: '2026-08-31' },
          { id: 'f-ago-3', fileName: 'Extrato_Educacao_Ago.txt', fileType: 'Extrato TXT', totalAmount: 238000.00, category: 'Educação', lines: [{ id: '3', account: 'Merenda & Transporte', amount: 238000.00 }], isExpanded: false, uploadDate: '2026-08-31' },
          { id: 'f-ago-4', fileName: 'Extrato_FUNDEB_Ago.txt', fileType: 'Extrato TXT', totalAmount: 425000.00, category: 'FUNDEB', lines: [{ id: '4', account: 'Professores Efetivos', amount: 425000.00 }], isExpanded: false, uploadDate: '2026-08-31' },
          { id: 'f-ago-5', fileName: 'Extrato_Custeio_Ago.txt', fileType: 'Extrato TXT', totalAmount: 95000.00, category: 'Custeio', lines: [{ id: '5', account: 'Manutenção Predial', amount: 95000.00 }], isExpanded: false, uploadDate: '2026-08-31' },
        ],
        invoices: [
          { id: 'nf-ago-1', category: 'FUS / Saúde', amount: 92100.00, description: 'Nota Ref. Medicamentos', date: '2026-08-14' },
          { id: 'nf-ago-2', category: 'Educação', amount: 68900.00, description: 'Nota Ref. Merenda', date: '2026-08-20' },
          { id: 'nf-ago-3', category: 'Custeio', amount: 45000.00, description: 'Nota Ref. Reparos', date: '2026-08-25' },
        ],
        savedAt: '2026-08-31T18:00:00.000Z'
      }
    };
  });

  // Estado do Mês Selecionado Atual
  const [currentFiles, setCurrentFiles] = useState<ExtratoFile[]>(() => {
    return monthlyHistory['2026-09']?.files || [
      {
        id: 'f-set-1',
        fileName: 'Extrato_Conta_Movimento_Set2026.txt',
        fileType: 'Extrato TXT',
        totalAmount: 548000.00,
        category: 'Movimento',
        lines: [
          { id: 'l1', account: 'Folha Salarial Servidores', amount: 490000.00, date: '2026-09-05' },
          { id: 'l2', account: 'Encargos INSS / FGTS', amount: 58000.00, date: '2026-09-07' },
        ],
        isExpanded: false,
        uploadDate: '2026-09-01'
      },
      {
        id: 'f-set-2',
        fileName: 'Extrato_Saude_FUS_Set2026.txt',
        fileType: 'Extrato TXT',
        totalAmount: 382500.00,
        category: 'FUS / Saúde',
        lines: [
          { id: 'l3', account: 'Hospital Municipal - Insumos', amount: 195000.00, date: '2026-09-02' },
          { id: 'l4', account: 'Contrato Médicos Plantonistas', amount: 187500.00, date: '2026-09-03' },
        ],
        isExpanded: false,
        uploadDate: '2026-09-01'
      },
      {
        id: 'f-set-3',
        fileName: 'Extrato_Educacao_Set2026.txt',
        fileType: 'Extrato TXT',
        totalAmount: 265000.00,
        category: 'Educação',
        lines: [
          { id: 'l5', account: 'Transporte Escolar Rural', amount: 145000.00, date: '2026-09-04' },
          { id: 'l6', account: 'Aquisição de Merenda Escolar', amount: 120000.00, date: '2026-09-04' },
        ],
        isExpanded: false,
        uploadDate: '2026-09-01'
      },
      {
        id: 'f-set-4',
        fileName: 'Extrato_FUNDEB_Set2026.txt',
        fileType: 'Extrato TXT',
        totalAmount: 450000.00,
        category: 'FUNDEB',
        lines: [
          { id: 'l7', account: 'Remuneração Magistério 70%', amount: 450000.00, date: '2026-09-05' },
        ],
        isExpanded: false,
        uploadDate: '2026-09-01'
      },
      {
        id: 'f-set-5',
        fileName: 'Extrato_Custeio_Set2026.txt',
        fileType: 'Extrato TXT',
        totalAmount: 115000.00,
        category: 'Custeio',
        lines: [
          { id: 'l8', account: 'Energia Elétrica & Água Prédios Públicos', amount: 72000.00, date: '2026-09-06' },
          { id: 'l9', account: 'Combustível Frota Municipal', amount: 43000.00, date: '2026-09-06' },
        ],
        isExpanded: false,
        uploadDate: '2026-09-01'
      }
    ];
  });

  const [currentInvoices, setCurrentInvoices] = useState<InvoiceItem[]>(() => {
    return monthlyHistory['2026-09']?.invoices || [
      { id: 'nf-set-1', category: 'FUS / Saúde', amount: 104500.00, description: 'Nota Ref. Medicamentos Hospital', date: '2026-09-02' },
      { id: 'nf-set-2', category: 'Educação', amount: 78900.00, description: 'Nota Ref. Merenda Escolar', date: '2026-09-03' },
      { id: 'nf-set-3', category: 'Custeio', amount: 43000.00, description: 'Nota Ref. Combustível', date: '2026-09-05' },
      { id: 'nf-set-4', category: 'FUS / Saúde', amount: 35000.00, description: 'Nota Ref. Locação Equipamentos', date: '2026-09-06' }
    ];
  });

  // Modais de Cadastro
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [showAddManualFileModal, setShowAddManualFileModal] = useState(false);

  // Formulário de Nova Nota (Apenas Conta + Valor + Descrição opcional)
  const [newInvoice, setNewInvoice] = useState<{
    category: AccountCategory;
    amount: string;
    description: string;
  }>({
    category: 'FUS / Saúde',
    amount: '',
    description: ''
  });

  const [newManualFile, setNewManualFile] = useState({
    title: '',
    amount: '',
    category: 'Movimento' as AccountCategory,
    description: ''
  });

  useEffect(() => {
    localStorage.setItem('fin_monthly_history', JSON.stringify(monthlyHistory));
  }, [monthlyHistory]);

  const handleSelectMonth = (monthId: string) => {
    setSelectedMonth(monthId);
    if (monthlyHistory[monthId]) {
      setCurrentFiles(monthlyHistory[monthId].files);
      setCurrentInvoices(monthlyHistory[monthId].invoices);
    } else {
      setCurrentFiles([]);
      setCurrentInvoices([]);
    }
  };

  const handleSaveMonthClose = () => {
    const monthObj = MONTH_OPTIONS.find(m => m.id === selectedMonth) || { id: selectedMonth, label: selectedMonth };
    const newRecord: MonthlyRecord = {
      monthId: selectedMonth,
      monthLabel: monthObj.label,
      files: currentFiles,
      invoices: currentInvoices,
      savedAt: new Date().toISOString()
    };

    setMonthlyHistory(prev => ({
      ...prev,
      [selectedMonth]: newRecord
    }));

    showToast(`Competência ${monthObj.label} salva no histórico com sucesso!`, 'success');
  };

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
  // CÁLCULOS E TOTAIS DO MÊS ATUAL
  // -------------------------------------------------------------
  const totalFilesAmount = useMemo(() => {
    return currentFiles.reduce((acc, f) => acc + f.totalAmount, 0);
  }, [currentFiles]);

  const totalInvoicesAmount = useMemo(() => {
    return currentInvoices.reduce((acc, inv) => acc + inv.amount, 0);
  }, [currentInvoices]);

  const grandTotalMonth = useMemo(() => {
    return totalFilesAmount + totalInvoicesAmount;
  }, [totalFilesAmount, totalInvoicesAmount]);

  const accountCategoryTotals = useMemo(() => {
    const totals: Record<AccountCategory, { files: number; invoices: number; total: number }> = {
      'Movimento': { files: 0, invoices: 0, total: 0 },
      'FUS / Saúde': { files: 0, invoices: 0, total: 0 },
      'Educação': { files: 0, invoices: 0, total: 0 },
      'FUNDEB': { files: 0, invoices: 0, total: 0 },
      'Custeio': { files: 0, invoices: 0, total: 0 },
      'Verbas Indenizatórias': { files: 0, invoices: 0, total: 0 },
      'Investimentos': { files: 0, invoices: 0, total: 0 },
      'Arrecadação / Próprios': { files: 0, invoices: 0, total: 0 },
      'Outros': { files: 0, invoices: 0, total: 0 },
    };

    currentFiles.forEach(f => {
      const cat = f.category || 'Outros';
      if (totals[cat]) {
        totals[cat].files += f.totalAmount;
        totals[cat].total += f.totalAmount;
      }
    });

    currentInvoices.forEach(inv => {
      const cat = inv.category || 'Outros';
      if (totals[cat]) {
        totals[cat].invoices += inv.amount;
        totals[cat].total += inv.amount;
      }
    });

    return totals;
  }, [currentFiles, currentInvoices]);

  // -------------------------------------------------------------
  // DADOS COMPARATIVOS MÊS A MÊS (EVOLUÇÃO & ANÁLISE DE AUMENTO)
  // -------------------------------------------------------------
  const comparativeChartData = useMemo(() => {
    const allMonths = Object.keys(monthlyHistory).sort();
    const monthsToDisplay = Array.from(new Set([...allMonths, selectedMonth])).sort();

    return monthsToDisplay.map(mId => {
      const isCurrentSelected = mId === selectedMonth;
      const files = isCurrentSelected ? currentFiles : (monthlyHistory[mId]?.files || []);
      const invoices = isCurrentSelected ? currentInvoices : (monthlyHistory[mId]?.invoices || []);

      const fileTotal = files.reduce((acc, f) => acc + f.totalAmount, 0);
      const invoiceTotal = invoices.reduce((acc, inv) => acc + inv.amount, 0);
      const grandTotal = fileTotal + invoiceTotal;

      const monthOption = MONTH_OPTIONS.find(m => m.id === mId);
      const label = monthOption ? monthOption.label.split('/')[0] : mId;

      return {
        monthId: mId,
        monthName: label,
        fullName: monthOption?.label || mId,
        'Extratos (R$)': fileTotal,
        'Notas Fiscais (R$)': invoiceTotal,
        'Total Geral (R$)': grandTotal,
      };
    });
  }, [monthlyHistory, selectedMonth, currentFiles, currentInvoices]);

  const previousMonthComparison = useMemo(() => {
    const sorted = Object.keys(monthlyHistory).sort();
    const currentIndex = sorted.indexOf(selectedMonth);
    
    let prevMonthId: string | null = null;
    if (currentIndex > 0) {
      prevMonthId = sorted[currentIndex - 1];
    } else {
      const allPrev = MONTH_OPTIONS.filter(m => m.id < selectedMonth).map(m => m.id);
      prevMonthId = allPrev.length > 0 ? allPrev[allPrev.length - 1] : null;
    }

    if (!prevMonthId || !monthlyHistory[prevMonthId]) {
      return { hasPrev: false, diff: 0, percent: 0, prevTotal: 0, prevLabel: '' };
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
      prevLabel: prevRecord.monthLabel
    };
  }, [monthlyHistory, selectedMonth, grandTotalMonth]);

  // -------------------------------------------------------------
  // AÇÕES: IMPORTAÇÃO E CADASTROS
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
          id: Math.random().toString(36).substring(2, 9),
          fileName: file.name,
          fileType,
          totalAmount,
          category: detectedCategory,
          lines,
          isExpanded: false,
          uploadDate: new Date().toISOString().split('T')[0]
        });
      } else {
        showToast(`O arquivo "${file.name}" não continha valores numéricos reconhecíveis.`, 'warning');
      }
    }

    if (newExtratoFiles.length > 0) {
      setCurrentFiles(prev => [...prev, ...newExtratoFiles]);
      showToast(`${newExtratoFiles.length} arquivo(s) importado(s) com sucesso! Total: ${formatCurrency(newExtratoFiles.reduce((a, b) => a + b.totalAmount, 0))}`, 'success');
    }
    e.target.value = '';
  };

  const handleAddManualFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualFile.title || !newManualFile.amount) return;

    const parsedAmount = parseBRL(newManualFile.amount);
    const newEntry: ExtratoFile = {
      id: `manual-${Math.random().toString(36).substring(2, 9)}`,
      fileName: `(Lançamento) ${newManualFile.title}`,
      fileType: 'Manual',
      totalAmount: parsedAmount,
      category: newManualFile.category,
      lines: [{ id: '1', account: newManualFile.title, amount: parsedAmount, description: newManualFile.description }],
      isExpanded: false,
      uploadDate: new Date().toISOString().split('T')[0]
    };

    setCurrentFiles(prev => [...prev, newEntry]);
    setShowAddManualFileModal(false);
    setNewManualFile({ title: '', amount: '', category: 'Movimento', description: '' });
    showToast('Lançamento discriminado adicionado!', 'success');
  };

  const handleAddInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBRL(newInvoice.amount);
    if (parsed <= 0) {
      showToast('Informe um valor válido para a nota.', 'warning');
      return;
    }

    const created: InvoiceItem = {
      id: `nf-${Math.random().toString(36).substring(2, 9)}`,
      category: newInvoice.category || 'FUS / Saúde',
      amount: parsed,
      description: newInvoice.description.trim() || undefined,
      date: new Date().toISOString().split('T')[0]
    };

    setCurrentInvoices(prev => [created, ...prev]);
    setShowAddInvoiceModal(false);
    setNewInvoice({
      category: 'FUS / Saúde',
      amount: '',
      description: ''
    });
    showToast('Nota adicionada com sucesso!', 'success');
  };

  const handleDeleteFile = (id: string) => {
    setCurrentFiles(prev => prev.filter(f => f.id !== id));
    showToast('Arquivo removido.');
  };

  const handleDeleteInvoice = (id: string) => {
    setCurrentInvoices(prev => prev.filter(inv => inv.id !== id));
    showToast('Nota fiscal removida.');
  };

  const toggleFileExpand = (id: string) => {
    setCurrentFiles(prev => prev.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f));
  };

  const handlePrintReport = () => {
    window.print();
  };

  const activeMonthLabel = MONTH_OPTIONS.find(m => m.id === selectedMonth)?.label || selectedMonth;

  return (
    <>
      {/* ========================================================================= */}
      {/* 📄 DOCUMENTO EXCLUSIVO DE IMPRESSÃO OFICIAL (VISÍVEL APENAS NA IMPRESSÃO)  */}
      {/* ========================================================================= */}
      <div className="financial-report-print hidden print:block p-8 bg-white text-black font-['Inter'] leading-normal">
        
        {/* CABEÇALHO OFICIAL INSTITUCIONAL */}
        <div className="border-b-2 border-black pb-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Landmark size={32} className="text-black" />
            <div>
              <h1 className="text-base font-black tracking-wider uppercase">ESTADO DE MATO GROSSO — PREFEITURA MUNICIPAL</h1>
              <h2 className="text-sm font-bold uppercase text-neutral-800">SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E FINANÇAS (SMAF)</h2>
            </div>
          </div>
          <div className="mt-3 bg-neutral-100 py-2 px-4 rounded border border-neutral-300 inline-block">
            <h3 className="text-xs font-black uppercase tracking-wider">
              DEMONSTRATIVO COMPARATIVO DE EXECUÇÃO, EXTRATOS & CONTAS BANCÁRIAS
            </h3>
          </div>
          <div className="flex justify-between items-center text-[10px] text-neutral-600 mt-2 px-2">
            <span><strong>Competência de Referência:</strong> {activeMonthLabel}</span>
            <span><strong>Emitido em:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* 1. QUADRO RESUMO EXECUTIVO */}
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
              <span className="text-[9px] uppercase font-bold text-neutral-600 block">Arquivos & Extratos</span>
              <span className="text-sm font-black block mt-0.5">{formatCurrency(totalFilesAmount)}</span>
            </div>
            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
              <span className="text-[9px] uppercase font-bold text-neutral-600 block">Total Notas Fiscais</span>
              <span className="text-sm font-black block mt-0.5">{formatCurrency(totalInvoicesAmount)}</span>
            </div>
            <div className="border border-neutral-300 rounded p-2.5 bg-neutral-50 text-center">
              <span className="text-[9px] uppercase font-bold text-neutral-600 block">Variação vs Mês Anterior</span>
              <span className="text-sm font-black block mt-0.5">
                {previousMonthComparison.hasPrev ? `${previousMonthComparison.diff > 0 ? '+' : ''}${previousMonthComparison.percent.toFixed(1)}%` : 'Base Inicial'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. DEMONSTRATIVO DE CONTAS & CATEGORIAS */}
        <div className="mb-6">
          <h4 className="text-[11px] font-black uppercase tracking-wider mb-2 border-b border-neutral-300 pb-1">
            2. Apuração Discriminada por Conta Bancária / Fonte de Recursos
          </h4>
          <table className="w-full text-left border-collapse border border-neutral-300 text-[10px]">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 font-black uppercase">
                <th className="py-2 px-3 border-r border-neutral-300">Conta / Destinação</th>
                <th className="py-2 px-3 text-right border-r border-neutral-300">Valor Extrato (R$)</th>
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

        {/* 3. MATRIZ COMPARATIVA MÊS A MÊS */}
        <div className="mb-8">
          <h4 className="text-[11px] font-black uppercase tracking-wider mb-2 border-b border-neutral-300 pb-1">
            3. Histórico Evolutivo & Comparativo Mês a Mês (Análise de Variação)
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
                  const isCur = m.monthId === selectedMonth;
                  const files = isCur ? currentFiles : (monthlyHistory[m.monthId]?.files || []);
                  const invs = isCur ? currentInvoices : (monthlyHistory[m.monthId]?.invoices || []);
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

        {/* 4. BLOCO OFICIAL DE ASSINATURAS */}
        <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs page-break-inside-avoid" data-signature-block="true">
          <div>
            <div className="border-t border-black pt-1.5 mx-auto max-w-[280px]">
              <p className="font-black uppercase">Secretário(a) Municipal de Finanças</p>
              <p className="text-[10px] text-neutral-600">Secretaria Municipal de Administração e Finanças</p>
            </div>
          </div>
          <div>
            <div className="border-t border-black pt-1.5 mx-auto max-w-[280px]">
              <p className="font-black uppercase">Contador(a) Geral / Responsável Técnico</p>
              <p className="text-[10px] text-neutral-600">CRC/MT — Contabilidade Municipal</p>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🖥️ INTERFACE EM TELA (MODERNA, ELEGANTE & ERGONÔMICA)                      */}
      {/* ========================================================================= */}
      <div className="financial-report-screen space-y-8 animate-in fade-in duration-300 font-['Inter'] print:hidden">
        
        {/* 1. CABEÇALHO DO COMPARATIVO & SELETOR DE MÊS */}
        <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1.5">
                <Scale size={16} /> Extratos, Notas Fiscais & Análise Comparativa
              </div>
              <h2 className="text-2xl md:text-3xl font-black font-['Montserrat'] tracking-tight text-white">
                Comparativo Visual de Contas & Fechamento Mensal
              </h2>
              <p className="text-slate-300 text-sm mt-1.5 max-w-2xl leading-relaxed">
                Apure os totais de cada conta, separe as Notas Fiscais dos arquivos discriminados e acompanhe a evolução mês a mês para verificar aumentos de despesas.
              </p>
            </div>

            {/* Seletor de Competência (Mês/Ano) */}
            <div className="flex flex-wrap items-center gap-2.5 bg-slate-800/90 p-2 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-2 px-3 text-xs font-bold text-slate-300">
                <Calendar size={15} className="text-indigo-400" /> Competência:
              </div>
              
              <select
                value={selectedMonth}
                onChange={e => handleSelectMonth(e.target.value)}
                className="bg-slate-950 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>

              <button
                onClick={handleSaveMonthClose}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                title="Salvar fechamento do mês no histórico comparativo"
              >
                <Save size={14} /> Salvar Mês
              </button>
            </div>
          </div>

          {/* 2. CARDS DE TOTAIS PRINCIPAIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
            
            {/* Card 1: Total Geral Consolidado */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60 flex flex-col justify-between hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 uppercase font-black tracking-wider">Total Geral Consolidado</span>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Wallet size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl md:text-3xl font-black font-['Montserrat'] text-white">
                  {formatCurrency(grandTotalMonth)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Soma de todas as contas no mês</p>
              </div>
            </div>

            {/* Card 2: Total Arquivos de Extrato */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60 flex flex-col justify-between hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 uppercase font-black tracking-wider">Arquivos & Extratos</span>
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl md:text-3xl font-black font-['Montserrat'] text-sky-400">
                  {formatCurrency(totalFilesAmount)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{currentFiles.length} arquivo(s) discriminado(s)</p>
              </div>
            </div>

            {/* Card 3: Total Notas Fiscais */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60 flex flex-col justify-between hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 uppercase font-black tracking-wider">Notas Fiscais</span>
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Receipt size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl md:text-3xl font-black font-['Montserrat'] text-amber-400">
                  {formatCurrency(totalInvoicesAmount)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{currentInvoices.length} nota(s) lançada(s)</p>
              </div>
            </div>

            {/* Card 4: Comparativo vs Mês Anterior */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60 flex flex-col justify-between hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 uppercase font-black tracking-wider">Variação vs Mês Anterior</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  previousMonthComparison.diff > 0 
                    ? 'bg-rose-500/20 text-rose-400' 
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {previousMonthComparison.diff > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
              </div>
              <div className="mt-3">
                {previousMonthComparison.hasPrev ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl md:text-3xl font-black font-['Montserrat'] ${
                        previousMonthComparison.diff > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {previousMonthComparison.diff > 0 ? '+' : ''}{previousMonthComparison.percent.toFixed(1)}%
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        previousMonthComparison.diff > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {previousMonthComparison.diff > 0 ? 'Aumento' : 'Redução'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {previousMonthComparison.diff > 0 ? '+' : ''}{formatCurrency(previousMonthComparison.diff)} vs {previousMonthComparison.prevLabel}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-slate-300">Base Inicial</p>
                    <p className="text-[11px] text-slate-400 mt-1">Primeiro mês registrado</p>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 3. GRADE DE TOTAIS POR CONTA BANCÁRIA (DISCRIMINAÇÃO TOTAL) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 font-['Montserrat']">
                <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
                Totais por Conta Bancária / Categoria
              </h3>
              <p className="text-xs text-slate-500">Valores apurados individualmente no mês ativo.</p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {ACCOUNT_CATEGORIES.filter(c => accountCategoryTotals[c].total > 0).length} contas com movimentação
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ACCOUNT_CATEGORIES.map(cat => {
              const data = accountCategoryTotals[cat];
              const hasValue = data.total > 0;
              const percentOfGrand = grandTotalMonth > 0 ? (data.total / grandTotalMonth) * 100 : 0;

              return (
                <div 
                  key={cat}
                  className={`p-5 rounded-3xl border transition-all ${
                    hasValue 
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700' 
                      : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {cat}
                    </span>
                    {hasValue && (
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {percentOfGrand.toFixed(1)}% do total
                      </span>
                    )}
                  </div>

                  <p className="text-xl font-black font-['Montserrat'] text-slate-900 dark:text-white mt-2">
                    {formatCurrency(data.total)}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block text-[9px]">Extrato</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(data.files)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold block text-[9px]">Notas</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(data.invoices)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. SUB-ABAS INTERNAS: EXTRATOS, NOTAS FISCAIS E COMPARATIVO VISUAL */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          
          {/* Navigation Tabs */}
          <div className="flex px-6 pt-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-2 overflow-x-auto">
            <button
              onClick={() => setViewSubTab('extratos')}
              className={`py-3.5 px-5 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                viewSubTab === 'extratos'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileSpreadsheet size={16} /> Arquivos & Extratos Discriminados ({currentFiles.length})
            </button>

            <button
              onClick={() => setViewSubTab('notas')}
              className={`py-3.5 px-5 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                viewSubTab === 'notas'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Receipt size={16} /> Notas Fiscais Separadas ({currentInvoices.length})
            </button>

            <button
              onClick={() => setViewSubTab('comparativo')}
              className={`py-3.5 px-5 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                viewSubTab === 'comparativo'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BarChart3 size={16} /> Comparativo Visual Mês a Mês (Aumentos & Tendências)
            </button>
          </div>

          <div className="p-6 md:p-8">
            
            {/* ========================================================= */}
            {/* ABA 1: ARQUIVOS & EXTRATOS DISCRIMINADOS                  */}
            {/* ========================================================= */}
            {viewSubTab === 'extratos' && (
              <div className="space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white font-['Montserrat']">Arquivos de Extrato Importados</h4>
                    <p className="text-xs text-slate-500">Suporta arquivos CNAB 240, CNAB 400, extratos de texto (.txt) e planilhas (.csv).</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowAddManualFileModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Plus size={15} /> Lançamento Manual
                    </button>

                    <label className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95">
                      <Upload size={15} /> Importar Extratos (.txt / CNAB)
                      <input type="file" accept=".txt,.csv" multiple onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {currentFiles.length === 0 ? (
                  <div className="text-center py-14 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30">
                    <FileSpreadsheet size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    <h5 className="font-bold text-slate-600 dark:text-slate-300 text-sm">Nenhum extrato importado neste mês</h5>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                      Carregue arquivos de extratos (.txt, CNAB 240 ou .csv) para calcular as contas automaticamente.
                    </p>
                    <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md">
                      <Upload size={16} /> Importar Arquivos de Extrato
                      <input type="file" accept=".txt,.csv" multiple onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentFiles.map(file => (
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
                              <div className="flex items-center gap-2">
                                <h5 className="font-black text-sm text-slate-900 dark:text-white">{file.fileName}</h5>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded">
                                  {file.fileType}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400">Conta:</span>
                                <select
                                  value={file.category}
                                  onChange={e => {
                                    const cat = e.target.value as AccountCategory;
                                    setCurrentFiles(prev => prev.map(f => f.id === file.id ? { ...f, category: cat } : f));
                                  }}
                                  className="text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 text-indigo-700 dark:text-indigo-300 border-none outline-none cursor-pointer"
                                >
                                  {ACCOUNT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span className="text-[11px] text-slate-500">{file.lines.length} lançamentos discriminados</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 justify-between md:justify-end">
                            <div className="text-right">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Discriminado</span>
                              <span className="text-xl font-black font-['Montserrat'] text-indigo-600 dark:text-indigo-400">
                                {formatCurrency(file.totalAmount)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-4">
                              <button
                                onClick={() => toggleFileExpand(file.id)}
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                title={file.isExpanded ? "Ocultar linhas" : "Ver linhas discriminadas"}
                              >
                                {file.isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                                title="Excluir arquivo"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {file.isExpanded && (
                          <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="py-2 px-3">Favorecido / Descrição</th>
                                    <th className="py-2 px-3 text-right">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {file.lines.map((l, i) => (
                                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{l.account}</td>
                                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(l.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* ABA 2: NOTAS FISCAIS SEPARADAS                            */}
            {/* ========================================================= */}
            {viewSubTab === 'notas' && (
              <div className="space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white font-['Montserrat']">Lançamento de Notas Fiscais</h4>
                    <p className="text-xs text-slate-500">Valores de notas fiscais separados e vinculados por conta.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddInvoiceModal(true)}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                    >
                      <Plus size={15} /> Nova Nota
                    </button>
                  </div>
                </div>

                {/* BARRA DE LANÇAMENTO RÁPIDO EM LINHA */}
                <form 
                  onSubmit={handleAddInvoiceSubmit} 
                  className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3"
                >
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Conta que Representa</label>
                    <select
                      value={newInvoice.category}
                      onChange={e => setNewInvoice({ ...newInvoice, category: e.target.value as AccountCategory })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {ACCOUNT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Valor da Nota (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">R$</span>
                      <input
                        required
                        type="text"
                        placeholder="0,00"
                        value={newInvoice.amount}
                        onChange={e => setNewInvoice({ ...newInvoice, amount: applyCurrencyMask(e.target.value) })}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black font-['Montserrat'] outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Identificação / Detalhe (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: NF 1042 ou Descrição"
                      value={newInvoice.description}
                      onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="pt-4 md:pt-0 shrink-0 self-end md:self-auto">
                    <button
                      type="submit"
                      className="w-full md:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={15} /> Adicionar
                    </button>
                  </div>
                </form>

                {currentInvoices.length === 0 ? (
                  <div className="text-center py-14 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30">
                    <Receipt size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    <h5 className="font-bold text-slate-600 dark:text-slate-300 text-sm">Nenhuma nota lançada neste mês</h5>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                      Insira o valor da nota e selecione para qual conta ela representa.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-4">Conta que Representa</th>
                          <th className="py-3 px-4 text-right">Valor da Nota</th>
                          <th className="py-3 px-4">Identificação / Detalhes</th>
                          <th className="py-3 px-4">Data</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {currentInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-xs transition-colors">
                            <td className="py-3.5 px-4 font-black">
                              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-lg text-[11px] font-black uppercase">
                                {inv.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black font-['Montserrat'] text-sm text-slate-900 dark:text-white">
                              {formatCurrency(inv.amount)}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                              {inv.description || <span className="text-slate-400 italic">Nota Lançada</span>}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-500">
                              {inv.date ? new Date(inv.date).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                title="Excluir Nota"
                              >
                                <Trash2 size={16} />
                              </button>
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
            {/* ABA 3: COMPARATIVO VISUAL MÊS A MÊS (ANÁLISE DE AUMENTO)   */}
            {/* ========================================================= */}
            {viewSubTab === 'comparativo' && (
              <div className="space-y-8">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 font-['Montserrat']">
                      <TrendingUp size={18} className="text-emerald-500" />
                      Evolução Financeira & Comparativo Mês a Mês
                    </h4>
                    <p className="text-xs text-slate-500">Acompanhe se houve aumento ou redução de despesas entre as competências.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintReport}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                    >
                      <Printer size={15} /> Imprimir Relatório Oficial
                    </button>
                  </div>
                </div>

                {/* GRÁFICO 1: EVOLUÇÃO DO TOTAL GERAL MÊS A MÊS */}
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 font-['Montserrat']">
                    Evolução do Total Geral Consolidado (Mês a Mês)
                  </h5>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={comparativeChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                        <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fill: '#888', fontSize: 11 }} />
                        <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '15px' }} />
                        <Bar dataKey="Extratos (R$)" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={45} />
                        <Bar dataKey="Notas Fiscais (R$)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={45} />
                        <Line type="monotone" dataKey="Total Geral (R$)" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* TABELA COMPARATIVA COMPLETA MÊS A MÊS */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 font-['Montserrat']">
                    Matriz Comparativa de Gastos por Conta (Mês a Mês)
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
                            const isCur = m.monthId === selectedMonth;
                            const files = isCur ? currentFiles : (monthlyHistory[m.monthId]?.files || []);
                            const invs = isCur ? currentInvoices : (monthlyHistory[m.monthId]?.invoices || []);
                            
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

                        {/* LINHA DE TOTAIS GERAIS */}
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

        {/* MODAL CADASTRAR NOTA FISCAL */}
        {showAddInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Lançar Nota Fiscal</h3>
                  <p className="text-xs text-slate-500 mt-1">Informe o valor e selecione a qual conta ela representa.</p>
                </div>
                <button onClick={() => setShowAddInvoiceModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddInvoiceSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Conta que Representa</label>
                  <select
                    value={newInvoice.category}
                    onChange={e => setNewInvoice({ ...newInvoice, category: e.target.value as AccountCategory })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none"
                  >
                    {ACCOUNT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black font-['Montserrat'] outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Identificação / Detalhes (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Nota Fiscal 1042 ou Descrição"
                    value={newInvoice.description}
                    onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-medium outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddInvoiceModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20"
                  >
                    Salvar Nota
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL LANÇAMENTO MANUAL DE EXTRATO */}
        {showAddManualFileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Lançamento Discriminado Manual</h3>
                  <p className="text-xs text-slate-500 mt-1">Adicione um extrato ou remessa manualmente.</p>
                </div>
                <button onClick={() => setShowAddManualFileModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddManualFileSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Título / Descrição da Remessa</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Folha de Pagamento - Concursados"
                    value={newManualFile.title}
                    onChange={e => setNewManualFile({ ...newManualFile, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Conta Vinculada</label>
                  <select
                    value={newManualFile.category}
                    onChange={e => setNewManualFile({ ...newManualFile, category: e.target.value as AccountCategory })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold outline-none"
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black font-['Montserrat'] outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddManualFileModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  >
                    Adicionar
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
