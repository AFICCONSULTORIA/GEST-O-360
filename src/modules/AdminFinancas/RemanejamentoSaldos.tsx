import React, { useState } from 'react';
import { 
  ArrowRightLeft, Wallet, Target, AlertTriangle, CheckCircle2, 
  Clock, Plus, Trash2, RefreshCw, Zap, ShieldAlert, FileSpreadsheet,
  ArrowRight, Info, Edit2
} from 'lucide-react';

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
const INITIAL_ORIGIN_ACCOUNTS: OriginAccount[] = [
  { id: 'fpm', code: '001-FPM', name: 'FPM - Fundo de Participação dos Municípios', bank: 'Banco do Brasil - Ag: 1234 / C: 50.100-1', initialBalance: 1500000.00 },
  { id: 'icms', code: '002-ICMS', name: 'ICMS - Cota-Parte Estadual', bank: 'Banco do Brasil - Ag: 1234 / C: 50.200-2', initialBalance: 850000.00 },
  { id: 'icms_exp', code: '003-ICMEXP', name: 'ICMS Exportação / Desoneração', bank: 'Banco do Brasil - Ag: 1234 / C: 50.205-9', initialBalance: 220000.00 },
  { id: 'fep', code: '004-FEP', name: 'FEP - Fundo Especial do Petróleo (Royalties)', bank: 'Caixa Econômica - Ag: 0987 / C: 70.300-8', initialBalance: 180000.00 },
  { id: 'sna', code: '005-SNA', name: 'SNA - Simples Nacional', bank: 'Banco do Brasil - Ag: 1234 / C: 50.400-3', initialBalance: 95000.00 },
  { id: 'fundeb30', code: '006-FDB30', name: 'FUNDEB (Outras Despesas)', bank: 'Banco do Brasil - Ag: 1234 / C: 60.100-7', initialBalance: 410000.00 },
];

// Contas de Destino e Demandas Iniciais
const INITIAL_DESTINATION_DEMANDS: DestinationDemand[] = [
  { id: 'movimento', code: 'DEST-01', name: 'MOVIMENTO (Conta Central de Livre Movimentação)', department: 'Tesouraria Geral', totalRequired: 327698.66, priority: 'Alta' },
  { id: 'folha', code: 'DEST-02', name: 'FOLHA DE PAGAMENTO (Servidores)', department: 'Recursos Humanos / Finanças', totalRequired: 850000.00, priority: 'Alta' },
  { id: 'fus', code: 'DEST-03', name: 'FUS - Fundo Único de Saúde (Custeio)', department: 'Secretaria de Saúde', totalRequired: 420000.00, priority: 'Alta' },
  { id: 'custeio', code: 'DEST-04', name: 'CUSTEIO OPERACIONAL (Fornecedores)', department: 'Administração Geral', totalRequired: 150000.00, priority: 'Média' },
  { id: 'educacao', code: 'DEST-05', name: 'EDUCAÇÃO - MDE Manutenção Ensino', department: 'Secretaria de Educação', totalRequired: 280000.00, priority: 'Normal' },
];

export const RemanejamentoSaldos: React.FC = () => {
  const [origins, setOrigins] = useState<OriginAccount[]>(INITIAL_ORIGIN_ACCOUNTS);
  const [destinations, setDestinations] = useState<DestinationDemand[]>(INITIAL_DESTINATION_DEMANDS);
  const [allocations, setAllocations] = useState<BalanceAllocation[]>([]);

  // Formulário de Lançamento
  const [selectedOriginId, setSelectedOriginId] = useState<string>('fpm');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('movimento');
  const [amountInput, setAmountInput] = useState<string>('');
  const [observationInput, setObservationInput] = useState<string>('');

  // Modais de Criação e Edição
  const [showAddOriginModal, setShowAddOriginModal] = useState<boolean>(false);
  const [showAddDestModal, setShowAddDestModal] = useState<boolean>(false);
  const [newOrigin, setNewOrigin] = useState({ code: '', name: '', bank: '', initialBalance: '' });
  const [newDest, setNewDest] = useState({ code: '', name: '', department: '', totalRequired: '', priority: 'Normal' as 'Alta' | 'Média' | 'Normal' });
  const [editingOriginId, setEditingOriginId] = useState<string | null>(null);
  const [editingDestId, setEditingDestId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'origin' | 'dest' } | null>(null);

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
  const handleExecuteAllocation = (e: React.FormEvent) => {
    e.preventDefault();

    if (numericAmount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    if (isInsufficientBalance) {
      return; // Bloqueado pelo CA03
    }

    const newAlloc: BalanceAllocation = {
      id: `alloc-${Date.now()}`,
      originId: selectedOriginId,
      destinationId: selectedDestinationId,
      amount: numericAmount,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      observation: observationInput.trim() || 'Remanejamento de saldo para cobertura de necessidade'
    };

    setAllocations(prev => [newAlloc, ...prev]);
    setAmountInput('');
    setObservationInput('');
  };

  // REVERSÃO DE ALOCAÇÃO
  const handleRemoveAllocation = (allocId: string) => {
    setAllocations(prev => prev.filter(a => a.id !== allocId));
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
  const handleAddOriginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrigin.name || !newOrigin.initialBalance) return;

    const parsedBalance = parseBRLToNumber(newOrigin.initialBalance);

    if (editingOriginId) {
      setOrigins(prev => prev.map(o => o.id === editingOriginId ? {
        ...o,
        code: newOrigin.code || o.code,
        name: newOrigin.name,
        bank: newOrigin.bank || o.bank,
        initialBalance: parsedBalance
      } : o));
    } else {
      const created: OriginAccount = {
        id: `orig-${Date.now()}`,
        code: newOrigin.code || `CONTA-${origins.length + 1}`,
        name: newOrigin.name,
        bank: newOrigin.bank || 'Banco Convencional',
        initialBalance: parsedBalance
      };
      setOrigins(prev => [...prev, created]);
    }

    setNewOrigin({ code: '', name: '', bank: '', initialBalance: '' });
    setEditingOriginId(null);
    setShowAddOriginModal(false);
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
  const handleAddDestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDest.name || !newDest.totalRequired) return;

    const parsedRequired = parseBRLToNumber(newDest.totalRequired);

    if (editingDestId) {
      setDestinations(prev => prev.map(d => d.id === editingDestId ? {
        ...d,
        code: newDest.code || d.code,
        name: newDest.name,
        department: newDest.department || d.department,
        totalRequired: parsedRequired,
        priority: newDest.priority
      } : d));
    } else {
      const created: DestinationDemand = {
        id: `dest-${Date.now()}`,
        code: newDest.code || `DEST-${destinations.length + 1}`,
        name: newDest.name,
        department: newDest.department || 'Geral',
        totalRequired: parsedRequired,
        priority: newDest.priority
      };
      setDestinations(prev => [...prev, created]);
    }

    setNewDest({ code: '', name: '', department: '', totalRequired: '', priority: 'Normal' });
    setEditingDestId(null);
    setShowAddDestModal(false);
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

  const confirmDeletion = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'origin') {
      setOrigins(prev => prev.filter(o => o.id !== itemToDelete.id));
      setAllocations(prev => prev.filter(a => a.originId !== itemToDelete.id));
      if (selectedOriginId === itemToDelete.id) setSelectedOriginId('');
    } else {
      setDestinations(prev => prev.filter(d => d.id !== itemToDelete.id));
      setAllocations(prev => prev.filter(a => a.destinationId !== itemToDelete.id));
      if (selectedDestinationId === itemToDelete.id) setSelectedDestinationId('');
    }
    
    setItemToDelete(null);
  };

  // RESET GERAL
  const handleResetAll = () => {
    if (confirm('Deseja limpar todos os remanejamentos e restaurar os saldos originais?')) {
      setAllocations([]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-['Inter']">
      
      {/* PAINEL SUPERIOR - RESUMO & AÇÕES RÁPIDAS */}
      <div className="bg-gradient-to-br from-[#003B6F] to-[#002244] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Zap size={14} /> Sistema de Gestão Financeira Dinâmica
            </div>
            <h2 className="text-2xl md:text-3xl font-black font-['Montserrat']">
              Matriz de Remanejamento & Distribuição de Saldos
            </h2>
            <p className="text-blue-100/80 text-sm mt-1 max-w-2xl">
              Alocação em tempo real de saldos bancários disponíveis para liquidação de demandas orçamentárias municipais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunExampleSimulation}
              className="flex items-center gap-2 px-5 py-3 bg-[#00A86B] hover:bg-[#00905B] text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-[#00A86B]/30 hover:scale-[1.02] active:scale-[0.98]"
              title="Carregar alocação de exemplo: FPM R$ 200k + ICMS R$ 127.698,66 -> MOVIMENTO"
            >
              <Zap size={16} /> Executar Exemplo do Requisito
            </button>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm backdrop-blur-md transition-all"
            >
              <RefreshCw size={16} /> Restaurar Saldos
            </button>
          </div>
        </div>

        {/* METRICAS CHAVE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs text-blue-200 uppercase font-semibold">Total Saldos Origem Disponíveis</p>
            <p className="text-xl md:text-2xl font-black mt-1 font-['Montserrat']">{formatCurrency(grandTotalOriginAvailable)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs text-blue-200 uppercase font-semibold">Total Necessidades Demandadas</p>
            <p className="text-xl md:text-2xl font-black mt-1 font-['Montserrat']">{formatCurrency(grandTotalDemandsRequired)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs text-blue-200 uppercase font-semibold">Total Remanejado</p>
            <p className="text-xl md:text-2xl font-black text-emerald-300 mt-1 font-['Montserrat']">{formatCurrency(grandTotalAllocated)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs text-blue-200 uppercase font-semibold">Demandas Liquidadas</p>
            <p className="text-xl md:text-2xl font-black text-amber-300 mt-1 font-['Montserrat']">
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
              Tem certeza que deseja excluir est{itemToDelete.type === 'origin' ? 'a conta de origem' : 'a demanda de destino'}? 
              Todos os remanejamentos vinculados também serão removidos. <br/><strong className="text-rose-500">Esta ação não pode ser desfeita.</strong>
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
