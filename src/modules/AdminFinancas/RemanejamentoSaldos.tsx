import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ArrowRightLeft, Wallet, Target, AlertTriangle, CheckCircle2, 
  Clock, Plus, Trash2, RefreshCw, Zap, ShieldAlert, FileSpreadsheet,
  ArrowRight, Info, Edit2, Upload, FileText, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { parseFinancialContent } from './ComparativoExtratos';
import { showToast } from '../../components/ui/Toast';

export interface OriginAccount {
  id: string;
  code: string;
  name: string;
  bank: string;
  initialBalance: number;
}

export interface DestinationDemand {
  id: string;
  code: string;
  name: string;
  department: string;
  totalRequired: number;
  priority: 'Alta' | 'Média' | 'Normal';
}

export interface BalanceAllocation {
  id: string;
  originId: string;
  destinationId: string;
  amount: number;
  timestamp: string;
  observation?: string;
}

// Contas e Saldos de Origem Iniciais
const INITIAL_ORIGIN_ACCOUNTS: OriginAccount[] = [];

// Contas de Destino e Demandas Iniciais
const INITIAL_DESTINATION_DEMANDS: DestinationDemand[] = [];


export const RemanejamentoSaldos: React.FC = () => {
  const [origins, setOrigins] = useState<OriginAccount[]>(INITIAL_ORIGIN_ACCOUNTS);
  const [destinations, setDestinations] = useState<DestinationDemand[]>(INITIAL_DESTINATION_DEMANDS);
  const [allocations, setAllocations] = useState<BalanceAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [originsRes, destsRes, allocsRes] = await Promise.all([
          supabase.from('fin_remanejamento_origens').select('*').order('created_at', { ascending: true }),
          supabase.from('fin_remanejamento_destinos').select('*').order('created_at', { ascending: true }),
          supabase.from('fin_remanejamento_alocacoes').select('*').order('created_at', { ascending: false })
        ]);

        if (originsRes.data) {
          setOrigins(originsRes.data.map(o => ({
            id: o.id, code: o.code || '', name: o.name, bank: o.bank || '', initialBalance: Number(o.initial_balance)
          })));
        }
        if (destsRes.data) {
          setDestinations(destsRes.data.map(d => ({
            id: d.id, code: d.code || '', name: d.name, department: d.department || '', totalRequired: Number(d.total_required), priority: d.priority || 'Normal'
          })));
        }
        if (allocsRes.data) {
          setAllocations(allocsRes.data.map(a => ({
            id: a.id, originId: a.origin_id, destinationId: a.destination_id, amount: Number(a.amount), observation: a.observation || '', timestamp: a.timestamp_text || new Date(a.created_at).toLocaleTimeString('pt-BR')
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Formulário de Lançamento
  const [selectedOriginId, setSelectedOriginId] = useState<string>('');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [observationInput, setObservationInput] = useState<string>('');

  // Modais de Criação e Edição
  const [showAddOriginModal, setShowAddOriginModal] = useState<boolean>(false);
  const [showAddDestModal, setShowAddDestModal] = useState<boolean>(false);
  const [newOrigin, setNewOrigin] = useState({ code: '', name: '', bank: '', initialBalance: '' });
  const [newDest, setNewDest] = useState({ code: '', name: '', department: '', totalRequired: '', priority: 'Normal' as 'Alta' | 'Média' | 'Normal' });
  const [editingOriginId, setEditingOriginId] = useState<string | null>(null);
  const [editingDestId, setEditingDestId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string | null, type: 'origin' | 'dest' | 'allocation' | 'importedFile' | 'allImportedFiles' } | null>(null);
  
  interface ImportedFile {
    id: string;
    fileName: string;
    totalAmount: number;
    lines: { account: string, amount: number }[];
    isExpanded: boolean;
    category?: 'Movimento' | 'FUS' | 'Educação' | 'FUNDEB' | 'Custeio' | 'Notas Fiscais' | 'Verbas Indenizatórias' | 'Sem conta';
  }

  // Lançamento Manual (Notas/Verbas/etc)
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);
  const [newManualEntry, setNewManualEntry] = useState({ description: '', amount: '', category: 'Notas Fiscais' as ImportedFile['category'] });

  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>(() => {
    const saved = localStorage.getItem('fin_imported_files');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler arquivos salvos', e);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('fin_imported_files', JSON.stringify(importedFiles));
  }, [importedFiles]);

  // Utilitário de Formatação de Moeda
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Conversor flexível de texto monetário para float (suporta '1.500.000,00' ou '1500000.00')
  const parseBRLToNumber = (valStr: string): number => {
    if (!valStr) return 0;
    const cleaned = valStr.toString().trim();
    if (cleaned.includes(',')) {
      const sanitized = cleaned.replace(/\./g, '').replace(',', '.');
      return parseFloat(sanitized) || 0;
    }
    return parseFloat(cleaned) || 0;
  };

  // Máscara de Moeda (formata ao digitar: ex 1000 => "10,00")
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

  // CÁLCULOS DINÂMICOS (CA01 & CA02)
  const getOriginTotals = (originId: string) => {
    const origin = origins.find(o => o.id === originId);
    const initial = origin ? origin.initialBalance : 0;
    const totalDebited = allocations
      .filter(a => a.originId === originId)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const remainingBalance = initial - totalDebited;
    return { initial, totalDebited, remainingBalance };
  };

  const getDestinationTotals = (destId: string) => {
    const dest = destinations.find(d => d.id === destId);
    const totalRequired = dest ? dest.totalRequired : 0;
    const totalAllocated = allocations
      .filter(a => a.destinationId === destId)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const pendingDemand = Math.max(0, totalRequired - totalAllocated);
    const progressPercent = totalRequired > 0 ? Math.min(100, (totalAllocated / totalRequired) * 100) : 0;
    const isLiquidated = totalAllocated >= totalRequired;
    const surplus = totalAllocated > totalRequired ? totalAllocated - totalRequired : 0;
    return { totalRequired, totalAllocated, pendingDemand, progressPercent, isLiquidated, surplus };
  };

  // CÁLCULOS GERAIS DA TELA
  const grandTotalOriginAvailable = origins.reduce((acc, o) => acc + getOriginTotals(o.id).remainingBalance, 0);
  const grandTotalDemandsRequired = destinations.reduce((acc, d) => acc + d.totalRequired, 0);
  const grandTotalAllocated = allocations.reduce((acc, a) => acc + a.amount, 0);
  const totalLiquidatedDestinations = destinations.filter(d => getDestinationTotals(d.id).isLiquidated).length;

  // VALIDAÇÃO EM TEMPO REAL NO FORMULÁRIO (CA03 & CA04)
  const numericAmount = parseBRLToNumber(amountInput);
  const currentSelectedOriginTotals = getOriginTotals(selectedOriginId);
  const currentSelectedDestTotals = getDestinationTotals(selectedDestinationId);

  const isInsufficientBalance = numericAmount > currentSelectedOriginTotals.remainingBalance;
  const willCauseSurplus = numericAmount > currentSelectedDestTotals.pendingDemand && currentSelectedDestTotals.pendingDemand > 0;
  const surplusAmountAlert = willCauseSurplus ? numericAmount - currentSelectedDestTotals.pendingDemand : 0;

  // EXECUTAR ALOCAÇÃO
  const handleExecuteAllocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (numericAmount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    if (isInsufficientBalance) {
      return; // Bloqueado pelo CA03
    }
    
    setIsLoading(true);
    const timestampStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const observationStr = observationInput.trim() || 'Remanejamento de saldo para cobertura de necessidade';

    try {
      const { data, error } = await supabase
        .from('fin_remanejamento_alocacoes')
        .insert({
          origin_id: selectedOriginId,
          destination_id: selectedDestinationId,
          amount: numericAmount,
          observation: observationStr,
          timestamp_text: timestampStr
        })
        .select()
        .single();
        
      if (data && !error) {
        const newAlloc: BalanceAllocation = {
          id: data.id,
          originId: data.origin_id,
          destinationId: data.destination_id,
          amount: Number(data.amount),
          timestamp: data.timestamp_text || timestampStr,
          observation: data.observation || ''
        };
        setAllocations(prev => [newAlloc, ...prev]);
        setAmountInput('');
        setObservationInput('');
      } else {
        console.error(error);
        alert('Erro ao salvar alocação');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // REVERSÃO DE ALOCAÇÃO
  const handleRemoveAllocation = (allocId: string) => {
    setItemToDelete({ id: allocId, type: 'allocation' });
  };

  // SIMULAÇÃO DO EXEMPLO DA ESPECIFICAÇÃO
  const handleRunExampleSimulation = () => {
    const fpmAccount = origins.find(o => o.id === 'fpm');
    const icmsAccount = origins.find(o => o.id === 'icms');
    const movDest = destinations.find(d => d.id === 'movimento');

    if (!fpmAccount || !icmsAccount || !movDest) return;

    // Limpa alocações prévias da conta movimento para mostrar limpo
    const filteredAllocations = allocations.filter(a => a.destinationId !== 'movimento');

    const alloc1: BalanceAllocation = {
      id: `alloc-ex-1-${Date.now()}`,
      originId: 'fpm',
      destinationId: 'movimento',
      amount: 200000.00,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      observation: 'Exemplo Req: Transferência FPM -> MOVIMENTO'
    };

    const alloc2: BalanceAllocation = {
      id: `alloc-ex-2-${Date.now()}`,
      originId: 'icms',
      destinationId: 'movimento',
      amount: 127698.66,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      observation: 'Exemplo Req: Cobertura final ICMS -> MOVIMENTO'
    };

    setAllocations([alloc1, alloc2, ...filteredAllocations]);
    setSelectedOriginId('fpm');
    setSelectedDestinationId('movimento');
  };

  // ADICIONAR OU EDITAR CONTA DE ORIGEM
  const handleAddOriginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrigin.name || !newOrigin.initialBalance) return;

    const parsedBalance = parseBRLToNumber(newOrigin.initialBalance);
    setIsLoading(true);

    try {
      if (editingOriginId) {
        const { error } = await supabase
          .from('fin_remanejamento_origens')
          .update({
            code: newOrigin.code,
            name: newOrigin.name,
            bank: newOrigin.bank,
            initial_balance: parsedBalance
          })
          .eq('id', editingOriginId);

        if (!error) {
          setOrigins(prev => prev.map(o => o.id === editingOriginId ? {
            ...o,
            code: newOrigin.code || o.code,
            name: newOrigin.name,
            bank: newOrigin.bank || o.bank,
            initialBalance: parsedBalance
          } : o));
        } else {
          console.error(error);
          alert('Erro ao atualizar conta');
        }
      } else {
        const { data, error } = await supabase
          .from('fin_remanejamento_origens')
          .insert({
            code: newOrigin.code || `CONTA-${origins.length + 1}`,
            name: newOrigin.name,
            bank: newOrigin.bank || 'Banco Convencional',
            initial_balance: parsedBalance
          })
          .select()
          .single();

        if (data && !error) {
          const created: OriginAccount = {
            id: data.id,
            code: data.code || '',
            name: data.name,
            bank: data.bank || '',
            initialBalance: Number(data.initial_balance)
          };
          setOrigins(prev => [...prev, created]);
        } else {
          console.error(error);
          alert('Erro ao criar conta');
        }
      }
    } finally {
      setIsLoading(false);
      setNewOrigin({ code: '', name: '', bank: '', initialBalance: '' });
      setEditingOriginId(null);
      setShowAddOriginModal(false);
    }
  };

  const handleEditOrigin = (origin: OriginAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOriginId(origin.id);
    setNewOrigin({
      code: origin.code,
      name: origin.name,
      bank: origin.bank,
      initialBalance: formatCurrency(origin.initialBalance).replace('R$', '').trim()
    });
    setShowAddOriginModal(true);
  };

  const handleDeleteOrigin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ id, type: 'origin' });
  };

  // ADICIONAR OU EDITAR DEMANDA DE DESTINO
  const handleAddDestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDest.name || !newDest.totalRequired) return;

    const parsedRequired = parseBRLToNumber(newDest.totalRequired);
    setIsLoading(true);

    try {
      if (editingDestId) {
        const { error } = await supabase
          .from('fin_remanejamento_destinos')
          .update({
            code: newDest.code,
            name: newDest.name,
            department: newDest.department,
            total_required: parsedRequired,
            priority: newDest.priority
          })
          .eq('id', editingDestId);

        if (!error) {
          setDestinations(prev => prev.map(d => d.id === editingDestId ? {
            ...d,
            code: newDest.code || d.code,
            name: newDest.name,
            department: newDest.department || d.department,
            totalRequired: parsedRequired,
            priority: newDest.priority
          } : d));
        } else {
          console.error(error);
          alert('Erro ao atualizar demanda');
        }
      } else {
        const { data, error } = await supabase
          .from('fin_remanejamento_destinos')
          .insert({
            code: newDest.code || `DEST-${destinations.length + 1}`,
            name: newDest.name,
            department: newDest.department || 'Geral',
            total_required: parsedRequired,
            priority: newDest.priority
          })
          .select()
          .single();
          
        if (data && !error) {
          const created: DestinationDemand = {
            id: data.id,
            code: data.code || '',
            name: data.name,
            department: data.department || '',
            totalRequired: Number(data.total_required),
            priority: data.priority as any
          };
          setDestinations(prev => [...prev, created]);
        } else {
          console.error(error);
          alert('Erro ao criar demanda');
        }
      }
    } finally {
      setIsLoading(false);
      setNewDest({ code: '', name: '', department: '', totalRequired: '', priority: 'Normal' });
      setEditingDestId(null);
      setShowAddDestModal(false);
    }
  };

  const handleEditDest = (dest: DestinationDemand, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDestId(dest.id);
    setNewDest({
      code: dest.code,
      name: dest.name,
      department: dest.department,
      totalRequired: formatCurrency(dest.totalRequired).replace('R$', '').trim(),
      priority: dest.priority
    });
    setShowAddDestModal(true);
  };

  const handleDeleteDest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ id, type: 'dest' });
  };

  const confirmDeletion = async () => {
    if (!itemToDelete) return;
    
    setIsLoading(true);
    try {
      if (itemToDelete.type === 'origin') {
        const { error } = await supabase.from('fin_remanejamento_origens').delete().eq('id', itemToDelete.id);
        if (!error) {
          setOrigins(prev => prev.filter(o => o.id !== itemToDelete.id));
          setAllocations(prev => prev.filter(a => a.originId !== itemToDelete.id));
          if (selectedOriginId === itemToDelete.id) setSelectedOriginId('');
        } else {
          console.error(error);
          alert('Erro ao excluir conta.');
        }
      } else if (itemToDelete.type === 'dest') {
        const { error } = await supabase.from('fin_remanejamento_destinos').delete().eq('id', itemToDelete.id);
        if (!error) {
          setDestinations(prev => prev.filter(d => d.id !== itemToDelete.id));
          setAllocations(prev => prev.filter(a => a.destinationId !== itemToDelete.id));
          if (selectedDestinationId === itemToDelete.id) setSelectedDestinationId('');
        } else {
          console.error(error);
          alert('Erro ao excluir demanda.');
        }
      } else if (itemToDelete.type === 'allocation' && itemToDelete.id) {
        const { error } = await supabase.from('fin_remanejamento_alocacoes').delete().eq('id', itemToDelete.id);
        if (!error) {
          setAllocations(prev => prev.filter(a => a.id !== itemToDelete.id));
        } else {
          console.error(error);
          alert('Erro ao remover alocação');
        }
      } else if (itemToDelete.type === 'importedFile' && itemToDelete.id) {
        setImportedFiles(prev => prev.filter(f => f.id !== itemToDelete.id));
      } else if (itemToDelete.type === 'allImportedFiles') {
        setImportedFiles([]);
      }
    } finally {
      setIsLoading(false);
      setItemToDelete(null);
    }
  };

  // RESET GERAL
  const handleResetAll = async () => {
    if (confirm('Deseja limpar todos os remanejamentos e restaurar os saldos originais?')) {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('fin_remanejamento_alocacoes').delete().neq('id', '0');
        if (!error) {
          setAllocations([]);
        } else {
          console.error(error);
          alert('Erro ao restaurar saldos.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // LEITURA DE MÚLTIPLOS ARQUIVOS TXT/CNAB 240/400/CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newFiles: ImportedFile[] = [];

    for (const file of files) {
      const content = await file.text();
      const { lines, totalAmount, detectedCategory } = parseFinancialContent(content, file.name);

      if (lines.length > 0 || totalAmount > 0) {
        let cat: ImportedFile['category'] = 'Sem conta';
        if (detectedCategory === 'Movimento') cat = 'Movimento';
        else if (detectedCategory === 'FUS / Saúde') cat = 'FUS';
        else if (detectedCategory === 'Educação') cat = 'Educação';
        else if (detectedCategory === 'FUNDEB') cat = 'FUNDEB';
        else if (detectedCategory === 'Custeio') cat = 'Custeio';
        else if (detectedCategory === 'Verbas Indenizatórias') cat = 'Verbas Indenizatórias';

        newFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          fileName: file.name,
          totalAmount,
          lines: lines.map(l => ({ account: l.account, amount: l.amount })),
          isExpanded: false,
          category: cat
        });
      }
    }

    if (newFiles.length > 0) {
      setImportedFiles(prev => [...prev, ...newFiles]);
      showToast(`${newFiles.length} arquivo(s) importado(s) com sucesso!`, 'success');
    }
    e.target.value = '';
  };

  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualEntry.description || !newManualEntry.amount) return;

    const parsedAmount = parseBRLToNumber(newManualEntry.amount);
    
    const manualFile: ImportedFile = {
      id: `manual-${Math.random().toString(36).substr(2, 9)}`,
      fileName: `(Manual) ${newManualEntry.description}`,
      totalAmount: parsedAmount,
      lines: [{ account: newManualEntry.description, amount: parsedAmount }],
      isExpanded: false,
      category: newManualEntry.category
    };

    setImportedFiles(prev => [...prev, manualFile]);
    setShowAddManualModal(false);
    setNewManualEntry({ description: '', amount: '', category: 'Notas Fiscais' });
  };

  const toggleFileExpanded = (fileId: string) => {
    setImportedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isExpanded: !f.isExpanded } : f));
  };

  const removeImportedFile = (fileId: string) => {
    setItemToDelete({ id: fileId, type: 'importedFile' });
  };

  const updateFileCategory = (fileId: string, category: 'Movimento' | 'FUS' | 'Educação' | 'FUNDEB' | 'Custeio' | 'Notas Fiscais' | 'Verbas Indenizatórias' | 'Sem conta') => {
    setImportedFiles(prev => prev.map(f => f.id === fileId ? { ...f, category } : f));
  };

  const fileAccountTotals = (() => {
    const totals: Record<'Movimento' | 'FUS' | 'Educação' | 'FUNDEB' | 'Custeio' | 'Notas Fiscais' | 'Verbas Indenizatórias' | 'Sem conta', number> = {
      Movimento: 0,
      FUS: 0,
      Educação: 0,
      FUNDEB: 0,
      Custeio: 0,
      'Notas Fiscais': 0,
      'Verbas Indenizatórias': 0,
      'Sem conta': 0
    };

    importedFiles.forEach(file => {
      const cat = file.category || 'Sem conta';
      totals[cat] = (totals[cat] || 0) + file.totalAmount;
    });

    return totals;
  })();

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-['Inter']">
      
      {/* PAINEL SUPERIOR - RESUMO & AÇÕES RÁPIDAS */}
      <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Zap size={14} /> Sistema de Gestão Financeira Dinâmica
            </div>
            <h2 className="text-2xl md:text-3xl font-black font-['Montserrat'] tracking-tight text-white">
              Matriz de Remanejamento & Distribuição de Saldos
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Alocação em tempo real de saldos bancários disponíveis para liquidação de demandas orçamentárias municipais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunExampleSimulation}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98]"
              title="Carregar alocação de exemplo: FPM R$ 200k + ICMS R$ 127.698,66 -> MOVIMENTO"
            >
              <Zap size={16} /> Executar Exemplo do Requisito
            </button>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm border border-slate-700 transition-all"
            >
              <RefreshCw size={16} /> Restaurar Saldos
            </button>
          </div>
        </div>

        {/* METRICAS CHAVE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <p className="text-xs text-slate-300 uppercase font-semibold">Total Saldos Origem Disponíveis</p>
            <p className="text-xl md:text-2xl font-black mt-1 font-['Montserrat'] text-white">{formatCurrency(grandTotalOriginAvailable)}</p>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <p className="text-xs text-slate-300 uppercase font-semibold">Total Necessidades Demandadas</p>
            <p className="text-xl md:text-2xl font-black mt-1 font-['Montserrat'] text-white">{formatCurrency(grandTotalDemandsRequired)}</p>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <p className="text-xs text-slate-300 uppercase font-semibold">Total Remanejado</p>
            <p className="text-xl md:text-2xl font-black text-emerald-400 mt-1 font-['Montserrat']">{formatCurrency(grandTotalAllocated)}</p>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <p className="text-xs text-slate-300 uppercase font-semibold">Demandas Liquidadas</p>
            <p className="text-xl md:text-2xl font-black text-amber-400 mt-1 font-['Montserrat']">
              {totalLiquidatedDestinations} de {destinations.length} <span className="text-xs font-normal">({Math.round((totalLiquidatedDestinations / destinations.length) * 100)}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL DOS TRÊS PILARES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* PILAR 1: PAINEL DE ORIGEM (SALDOS DISPONÍVEIS) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-[#003B6F] dark:text-blue-400 font-bold">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight font-['Montserrat'] text-neutral-900 dark:text-white">
                    1. Painel de Origem
                  </h3>
                  <p className="text-xs text-neutral-500 font-normal">Saldos Bancários Disponíveis</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddOriginModal(true)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#003B6F] dark:text-white rounded-xl transition-colors"
                title="Adicionar Nova Conta de Origem"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {origins.map(origin => {
                const { initial, totalDebited, remainingBalance } = getOriginTotals(origin.id);
                const isLow = remainingBalance <= initial * 0.1;
                const isSelected = selectedOriginId === origin.id;

                return (
                  <div
                    key={origin.id}
                    onClick={() => setSelectedOriginId(origin.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#003B6F] dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm ring-2 ring-[#003B6F]/20'
                        : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-[10px] font-black uppercase">
                          {origin.code}
                        </span>
                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white mt-1">
                          {origin.name}
                        </h4>
                        <p className="text-[11px] text-neutral-400">{origin.bank}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleEditOrigin(origin, e)}
                          className="p-1.5 text-neutral-400 hover:text-[#003B6F] dark:hover:text-blue-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-all"
                          title="Editar Conta"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteOrigin(origin.id, e)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-all"
                          title="Excluir Conta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Saldo Inicial</span>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-300">{formatCurrency(initial)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Total Debitado</span>
                        <p className="font-semibold text-rose-600 dark:text-rose-400">-{formatCurrency(totalDebited)}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between bg-white dark:bg-[#1f1f1f] p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <span className="text-xs font-bold text-neutral-500">Saldo Restante:</span>
                      <span className={`text-sm font-black font-['Montserrat'] ${
                        remainingBalance <= 0 ? 'text-red-600 dark:text-red-400' :
                        isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {formatCurrency(remainingBalance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PILAR 2: PAINEL DE DESTINO (NECESSIDADES / DEMANDAS) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight font-['Montserrat'] text-neutral-900 dark:text-white">
                    2. Painel de Destino
                  </h3>
                  <p className="text-xs text-neutral-500 font-normal">Demandas & Necessidades Totais</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddDestModal(true)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors"
                title="Adicionar Nova Demanda de Destino"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {destinations.map(dest => {
                const { totalRequired, totalAllocated, pendingDemand, progressPercent, isLiquidated, surplus } = getDestinationTotals(dest.id);
                const isSelected = selectedDestinationId === dest.id;

                return (
                  <div
                    key={dest.id}
                    onClick={() => setSelectedDestinationId(dest.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-[10px] font-black uppercase">
                            {dest.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            dest.priority === 'Alta' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' :
                            dest.priority === 'Média' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          }`}>
                            {dest.priority}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white mt-1">
                          {dest.name}
                        </h4>
                        <p className="text-[11px] text-neutral-400">{dest.department}</p>
                      </div>

                      {/* BADGE CA02: Liquidada/Atendida E BOTOES */}
                      <div className="flex flex-col items-end gap-2">
                        {isLiquidated ? (
                          <span className="px-2.5 py-1 bg-[#00A86B]/15 text-[#00A86B] border border-[#00A86B]/30 rounded-full text-[11px] font-black flex items-center gap-1 shrink-0 animate-in zoom-in-90 duration-300">
                            <CheckCircle2 size={13} /> Liquidada
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold shrink-0">
                            Pendente
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleEditDest(dest, e)}
                            className="p-1.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md transition-all"
                            title="Editar Demanda"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteDest(dest.id, e)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-all"
                            title="Excluir Demanda"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* TERMÔMETRO DE PROGRESSO */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-medium text-neutral-500 mb-1">
                        <span>Cobertura: {progressPercent.toFixed(1)}%</span>
                        <span>Total: {formatCurrency(totalRequired)}</span>
                      </div>
                      <div className="h-2.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isLiquidated ? 'bg-[#00A86B]' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, progressPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Alocado</span>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAllocated)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">Necessidade Pendente</span>
                        <p className={`font-black font-['Montserrat'] ${
                          pendingDemand === 0 ? 'text-[#00A86B]' : 'text-neutral-900 dark:text-white'
                        }`}>
                          {formatCurrency(pendingDemand)}
                        </p>
                      </div>
                    </div>

                    {surplus > 0 && (
                      <div className="mt-2 p-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 rounded-lg text-[10px] flex items-center gap-1">
                        <Info size={12} /> Superávit alocado: +{formatCurrency(surplus)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PILAR 3: MÓDULO DE DISTRIBUIÇÃO & ALOCAÇÃO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#003B6F] dark:text-white font-bold mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight font-['Montserrat']">
                  3. Módulo de Alocação
                </h3>
                <p className="text-xs text-neutral-500 font-normal">Lançar Operação de Remanejamento</p>
              </div>
            </div>

            <form onSubmit={handleExecuteAllocation} className="space-y-4">
              
              {/* SELEÇÃO DA CONTA DE ORIGEM (DÉBITO) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Conta de Origem (Débito)
                </label>
                <select
                  value={selectedOriginId}
                  onChange={(e) => setSelectedOriginId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-[#003B6F] outline-none transition-all"
                >
                  {origins.map(o => {
                    const { remainingBalance } = getOriginTotals(o.id);
                    return (
                      <option key={o.id} value={o.id}>
                        {o.code} - {o.name} ({formatCurrency(remainingBalance)})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1 flex justify-between">
                  <span>Disponível nesta conta:</span>
                  <strong className="text-neutral-900 dark:text-white">{formatCurrency(currentSelectedOriginTotals.remainingBalance)}</strong>
                </p>
              </div>

              {/* SELEÇÃO DA CONTA DE DESTINO (CRÉDITO) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Conta de Destino (Crédito)
                </label>
                <select
                  value={selectedDestinationId}
                  onChange={(e) => setSelectedDestinationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-[#003B6F] outline-none transition-all"
                >
                  {destinations.map(d => {
                    const { pendingDemand, isLiquidated } = getDestinationTotals(d.id);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name} {isLiquidated ? '(100% ATENDIDA)' : `(Falta: ${formatCurrency(pendingDemand)})`}
                      </option>
                    );
                  })}
                </select>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                  <span>Necessidade Pendente:</span>
                  <strong className={currentSelectedDestTotals.pendingDemand === 0 ? 'text-[#00A86B]' : 'text-neutral-900 dark:text-white'}>
                    {formatCurrency(currentSelectedDestTotals.pendingDemand)}
                  </strong>
                </div>
              </div>

              {/* VALOR A RETIRAR COM BOTOES DE PREENCHIMENTO RÁPIDO */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Valor a ser Retirado (R$)
                  </label>
                  {currentSelectedDestTotals.pendingDemand > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountInput(applyCurrencyMask(currentSelectedDestTotals.pendingDemand.toFixed(2)))}
                      className="text-[10px] font-bold text-[#003B6F] dark:text-blue-400 hover:underline"
                    >
                      Preencher Pendência
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-neutral-400 font-bold text-sm">R$</span>
                  <input
                    type="text"
                    value={amountInput}
                    onChange={(e) => setAmountInput(applyCurrencyMask(e.target.value))}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-[#003B6F] outline-none transition-all"
                  />
                </div>
              </div>

              {/* OBSERVAÇÃO / JUSTIFICATIVA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Observação / Trâmite (Opcional)
                </label>
                <input
                  type="text"
                  value={observationInput}
                  onChange={(e) => setObservationInput(e.target.value)}
                  placeholder="Ex: Cobertura de folha mensal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#003B6F] outline-none transition-all"
                />
              </div>

              {/* VALIDAÇÃO CA03: ALERTA DE SALDO INSUFICIENTE NA ORIGEM */}
              {isInsufficientBalance && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
                  <ShieldAlert size={20} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <strong className="block font-bold uppercase tracking-wider text-[11px] text-rose-800 dark:text-rose-200">
                      Alerta de Validação [CA03]
                    </strong>
                    Saldo insuficiente na conta de origem para esta operação.
                  </div>
                </div>
              )}

              {/* VALIDAÇÃO CA04: ALERTA DE SUPERÁVIT NO DESTINO */}
              {willCauseSurplus && !isInsufficientBalance && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-300 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-[11px] uppercase">Aviso de Superávit [CA04]</strong>
                    O valor informado excede a necessidade pendente deste destino em {formatCurrency(surplusAmountAlert)}.
                  </div>
                </div>
              )}

              {/* BOTÃO SUBMIT */}
              <button
                type="submit"
                disabled={isInsufficientBalance || numericAmount <= 0}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                  isInsufficientBalance || numericAmount <= 0
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none'
                    : 'bg-[#003B6F] hover:bg-[#002b52] text-white active:scale-[0.99]'
                }`}
              >
                <ArrowRight size={18} /> Confirmar Alocação de Saldo
              </button>

            </form>
          </div>
        </div>

      </div>

      {/* HISTÓRICO & EXTRATO DE ALOCAÇÕES REALIZADAS */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-xl font-black text-[#003B6F] dark:text-white font-['Montserrat'] flex items-center gap-2">
              <FileSpreadsheet size={22} /> Extrato de Remanejamentos Efetuados
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Registro auditável de transferências entre saldos bancários de origem e necessidades de destino.
            </p>
          </div>
          <div className="text-xs text-neutral-500 font-semibold bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-xl">
            Total de Registros: <strong className="text-neutral-900 dark:text-white">{allocations.length}</strong>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
            <Clock size={36} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
            <h4 className="font-bold text-neutral-700 dark:text-neutral-300 text-sm">Nenhum remanejamento realizado nesta sessão</h4>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
              Selecione as contas de origem e destino acima para efetuar lançamentos ou clique em "Executar Exemplo do Requisito".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-black uppercase tracking-widest text-neutral-400">
                  <th className="py-3 px-4">Horário</th>
                  <th className="py-3 px-4">Conta de Origem (Débito)</th>
                  <th className="py-3 px-4">Conta de Destino (Crédito)</th>
                  <th className="py-3 px-4 text-right">Valor Retirado</th>
                  <th className="py-3 px-4">Observação</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((alloc) => {
                  const orig = origins.find(o => o.id === alloc.originId);
                  const dest = destinations.find(d => d.id === alloc.destinationId);

                  return (
                    <tr 
                      key={alloc.id}
                      className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-neutral-500">
                        {alloc.timestamp}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                        <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-[10px] font-bold mr-2">
                          {orig?.code || 'N/A'}
                        </span>
                        {orig?.name || alloc.originId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded text-[10px] font-bold mr-2">
                          {dest?.code || 'N/A'}
                        </span>
                        {dest?.name || alloc.destinationId}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black font-['Montserrat'] text-neutral-900 dark:text-white">
                        {formatCurrency(alloc.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-500 max-w-xs truncate">
                        {alloc.observation || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleRemoveAllocation(alloc.id)}
                          className="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all"
                          title="Desfazer / Estornar este lançamento"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAINEL DE COMPARAÇÃO VISUAL (TXT) */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-xl font-black text-[#003B6F] dark:text-white font-['Montserrat'] flex items-center gap-2">
              <FileText size={22} /> Extrato para Comparação Visual (TXT)
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Faça o upload de um arquivo TXT contendo as contas e os valores (ex: MENSAL 90) para comparar os saldos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {importedFiles.length > 0 && (
              <button
                onClick={() => setItemToDelete({ id: null, type: 'allImportedFiles' })}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
              >
                <X size={14} /> Limpar Todos
              </button>
            )}
            <button
              onClick={() => setShowAddManualModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-xs transition-colors"
            >
              <Plus size={14} /> Adicionar Manual
            </button>
            <label className="flex items-center gap-2 px-5 py-2.5 bg-[#003B6F] hover:bg-[#002b52] text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md active:scale-95">
              <Upload size={16} /> Importar Arquivos
              <input type="file" accept=".txt" multiple onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* CARDS DE TOTAIS POR CONTA (EXTRATOS) */}
        {importedFiles.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {Object.entries(fileAccountTotals).map(([key, value]) => {
                const isActive = value > 0;
                return (
                  <div 
                    key={key} 
                    className={`rounded-2xl p-4 transition-all duration-300 border ${
                      isActive 
                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50 shadow-sm' 
                        : 'bg-neutral-50 dark:bg-neutral-900/30 border-neutral-100 dark:border-neutral-800 opacity-70'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">{key}</p>
                    <p className={`text-base md:text-lg font-black font-['Montserrat'] truncate ${
                      isActive ? 'text-[#003B6F] dark:text-blue-400' : 'text-neutral-400 dark:text-neutral-600'
                    }`} title={formatCurrency(value)}>
                      {formatCurrency(value)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* CARDS DE SOMAS COMPOSTAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Movimento + Notas Fiscais</p>
                <p className="text-xl font-black font-['Montserrat'] text-indigo-900 dark:text-indigo-200">
                  {formatCurrency(fileAccountTotals['Movimento'] + fileAccountTotals['Notas Fiscais'])}
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Movimento + Verbas</p>
                <p className="text-xl font-black font-['Montserrat'] text-emerald-900 dark:text-emerald-200">
                  {formatCurrency(fileAccountTotals['Movimento'] + fileAccountTotals['Verbas Indenizatórias'])}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-900/30 border border-amber-100 dark:border-amber-800/50 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-1">Movimento + Notas + Verbas</p>
                <p className="text-xl font-black font-['Montserrat'] text-amber-900 dark:text-amber-200">
                  {formatCurrency(fileAccountTotals['Movimento'] + fileAccountTotals['Notas Fiscais'] + fileAccountTotals['Verbas Indenizatórias'])}
                </p>
              </div>
            </div>
          </>
        )}

        {importedFiles.length > 0 ? (
          <div className="space-y-4">
            {importedFiles.map(file => (
              <div key={file.id} className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-neutral-50/50 dark:bg-neutral-900/30">
                {/* File Header / Summary */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#171717]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-[#003B6F] dark:text-blue-400">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white">{file.fileName}</h4>
                      <p className="text-xs text-neutral-500 font-medium mt-0.5">{file.lines.length} registros identificados</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-500">Categoria:</span>
                        <select 
                          value={file.category || 'Sem conta'}
                          onChange={(e) => updateFileCategory(file.id, e.target.value as any)}
                          className="text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1 outline-none text-[#003B6F] dark:text-blue-400 focus:ring-2 focus:ring-[#003B6F]"
                        >
                          <option value="Movimento">Movimento</option>
                          <option value="FUS">FUS</option>
                          <option value="Educação">Educação</option>
                          <option value="FUNDEB">FUNDEB</option>
                          <option value="Custeio">Custeio</option>
                          <option value="Notas Fiscais">Notas Fiscais</option>
                          <option value="Verbas Indenizatórias">Verbas Indenizatórias</option>
                          <option value="Sem conta">Sem conta</option>
                        </select>
                      </div>
                      {file.lines.filter(l => l.amount === 0).length > 0 && (
                        <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                          <AlertTriangle size={12} /> {file.lines.filter(l => l.amount === 0).length} registro(s) com valor zerado
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">Total do Arquivo</p>
                      <p className="text-xl font-black font-['Montserrat'] text-[#003B6F] dark:text-blue-400">
                        {formatCurrency(file.totalAmount)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-800 pl-6">
                      <button 
                        onClick={() => toggleFileExpanded(file.id)}
                        className="p-2 text-neutral-500 hover:text-[#003B6F] hover:bg-blue-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        title={file.isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                      >
                        {file.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      <button 
                        onClick={() => removeImportedFile(file.id)}
                        className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Remover este arquivo"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Details (Expanded) */}
                {file.isExpanded && (
                  <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                            <th className="py-2 px-3">Conta / Favorecido</th>
                            <th className="py-2 px-3 text-right">Valor Identificado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {file.lines.map((item, idx) => (
                            <tr key={idx} className={`border-b border-neutral-100 dark:border-neutral-800/60 text-xs ${item.amount === 0 ? 'bg-amber-50/80 dark:bg-amber-950/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}>
                              <td className="py-2 px-3 font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                {item.amount === 0 && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
                                {item.account}
                              </td>
                              <td className={`py-2 px-3 text-right font-bold ${item.amount === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}>
                                {item.amount === 0 ? 'VALOR ZERADO' : formatCurrency(item.amount)}
                              </td>
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
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30">
            <FileSpreadsheet size={36} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
            <h4 className="font-bold text-neutral-500 dark:text-neutral-400 text-sm">Nenhum arquivo importado</h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
              Clique no botão "Importar Arquivos" acima para carregar e resumir seus extratos.
            </p>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR ORIGEM */}
      {showAddOriginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-[#003B6F] dark:text-white mb-4">
              {editingOriginId ? 'Editar Conta de Origem' : 'Nova Conta de Origem (Saldo)'}
            </h3>
            <form onSubmit={handleAddOriginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Código Identificador</label>
                <input
                  type="text"
                  placeholder="Ex: 007-ROYALTY"
                  value={newOrigin.code}
                  onChange={e => setNewOrigin({ ...newOrigin, code: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Nome da Conta / Fonte</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fundo Especial de Saúde"
                  value={newOrigin.name}
                  onChange={e => setNewOrigin({ ...newOrigin, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Dados Bancários / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Banco do Brasil Ag 1234 C/C 9999"
                  value={newOrigin.bank}
                  onChange={e => setNewOrigin({ ...newOrigin, bank: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Saldo Inicial (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-bold text-sm">R$</span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1.500.000,00"
                    value={newOrigin.initialBalance}
                    onChange={e => setNewOrigin({ ...newOrigin, initialBalance: applyCurrencyMask(e.target.value) })}
                    className="w-full pl-10 pr-3 py-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                  />
                </div>
                {newOrigin.initialBalance && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    Valor formatado: {formatCurrency(parseBRLToNumber(newOrigin.initialBalance))}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOriginModal(false);
                    setEditingOriginId(null);
                    setNewOrigin({ code: '', name: '', bank: '', initialBalance: '' });
                  }}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#003B6F] text-white rounded-xl text-xs font-bold"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR DESTINO */}
      {showAddDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-[#003B6F] dark:text-white mb-4">
              {editingDestId ? 'Editar Demanda de Destino' : 'Nova Conta de Destino (Demanda)'}
            </h3>
            <form onSubmit={handleAddDestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Código Identificador</label>
                <input
                  type="text"
                  placeholder="Ex: DEST-06"
                  value={newDest.code}
                  onChange={e => setNewDest({ ...newDest, code: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Nome da Demanda / Projeto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reforma da Escola Central"
                  value={newDest.name}
                  onChange={e => setNewDest({ ...newDest, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Secretaria / Departamento</label>
                <input
                  type="text"
                  placeholder="Ex: Secretaria de Obras"
                  value={newDest.department}
                  onChange={e => setNewDest({ ...newDest, department: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Valor Total Geral Exigido (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-bold text-sm">R$</span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 350.000,00"
                    value={newDest.totalRequired}
                    onChange={e => setNewDest({ ...newDest, totalRequired: applyCurrencyMask(e.target.value) })}
                    className="w-full pl-10 pr-3 py-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                  />
                </div>
                {newDest.totalRequired && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    Valor formatado: {formatCurrency(parseBRLToNumber(newDest.totalRequired))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Prioridade</label>
                <select
                  value={newDest.priority}
                  onChange={e => setNewDest({ ...newDest, priority: e.target.value as any })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDestModal(false);
                    setEditingDestId(null);
                    setNewDest({ code: '', name: '', department: '', totalRequired: '', priority: 'Normal' });
                  }}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00A86B] text-white rounded-xl text-xs font-bold"
                >
                  Salvar Demanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR LANÇAMENTO MANUAL (NOTAS/VERBAS) */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-[#003B6F] dark:text-white mb-4">
              Adicionar Lançamento Manual
            </h3>
            <form onSubmit={handleAddManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Descrição / Referência</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nota Fiscal Ref. Outubro"
                  value={newManualEntry.description}
                  onChange={e => setNewManualEntry({ ...newManualEntry, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Categoria</label>
                <select
                  value={newManualEntry.category}
                  onChange={e => setNewManualEntry({ ...newManualEntry, category: e.target.value as any })}
                  className="w-full p-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                >
                  <option value="Movimento">Movimento</option>
                  <option value="FUS">FUS</option>
                  <option value="Educação">Educação</option>
                  <option value="FUNDEB">FUNDEB</option>
                  <option value="Custeio">Custeio</option>
                  <option value="Notas Fiscais">Notas Fiscais</option>
                  <option value="Verbas Indenizatórias">Verbas Indenizatórias</option>
                  <option value="Sem conta">Sem conta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Valor Total (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-bold text-sm">R$</span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 5.400,00"
                    value={newManualEntry.amount}
                    onChange={e => setNewManualEntry({ ...newManualEntry, amount: applyCurrencyMask(e.target.value) })}
                    className="w-full pl-10 pr-3 py-2.5 border rounded-xl dark:bg-neutral-900 dark:border-neutral-800 text-sm font-semibold"
                  />
                </div>
                {newManualEntry.amount && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    Valor formatado: {formatCurrency(parseBRLToNumber(newManualEntry.amount))}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddManualModal(false);
                    setNewManualEntry({ description: '', amount: '', category: 'Notas Fiscais' });
                  }}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00A86B] text-white rounded-xl text-xs font-bold"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">
              Confirmar Exclusão
            </h3>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
              {itemToDelete.type === 'origin' && 'Tem certeza que deseja excluir esta conta de origem? Todos os remanejamentos vinculados também serão removidos.'}
              {itemToDelete.type === 'dest' && 'Tem certeza que deseja excluir esta demanda de destino? Todos os remanejamentos vinculados também serão removidos.'}
              {itemToDelete.type === 'allocation' && 'Tem certeza que deseja estornar e excluir este lançamento de remanejamento?'}
              {itemToDelete.type === 'importedFile' && 'Tem certeza que deseja remover este arquivo importado da comparação?'}
              {itemToDelete.type === 'allImportedFiles' && 'Tem certeza que deseja limpar todos os arquivos importados da lista?'}
              <br/><strong className="text-rose-500">Esta ação não pode ser desfeita.</strong>
            </p>
            <div className="flex justify-stretch w-full gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletion}
                className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-600/20 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
