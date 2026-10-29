import React from 'react';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MOCK_CONTRACTS } from '../../App';
import { Contract, Institution, AdminUser } from '../../types';
import { showToast } from '../../components/ui/Toast';
import { DemoFillButton } from '../../components/DemoFillButton';
import { isDemoEnvironment } from '../../lib/demoManager';
import { hasPermission } from '../../lib/permissions';

const {
  Plus, Search, Edit2, Trash2, Eye, FileText, TrendingUp, ShieldAlert,
  Download, CheckCircle2, AlertTriangle, Target, X, Printer, RefreshCw,
  Calendar, Building2, UserCheck, ShieldCheck
} = LucideIcons;

const CONTRACT_CATEGORIES = [
  'Pregão Eletrônico',
  'Dispensa (Art. 75)',
  'Inexigibilidade (Art. 74)',
  'Concorrência',
  'Adesão a ARP',
  'Credenciamento',
  'Licitação'
];

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const getDaysUntilDeadline = (deadline?: string): number | null => {
  if (!deadline) return null;
  const target = new Date(`${deadline}T12:00:00`);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const ContractsModule = ({
  currentInstitution,
  currentUser
}: {
  currentInstitution?: Institution | { id: string; name?: string; subdomain?: string; cert_links?: any } | null;
  currentUser?: AdminUser | null;
}) => {
  const instKey = currentInstitution?.id || (currentInstitution as any)?.subdomain || 'default';
  const canEdit = !currentUser || hasPermission(currentUser, 'contracts', 'edit');
  const canDelete = !currentUser || hasPermission(currentUser, 'contracts', 'admin');

  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'review' | 'risk' | 'expiring30' | 'expired'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('Todas');

  // Modais
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingContract, setEditingContract] = React.useState<Contract | null>(null);
  const [viewingContract, setViewingContract] = React.useState<Contract | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false);
  const [isLookingUpCnpj, setIsLookingUpCnpj] = React.useState(false);

  const [formData, setFormData] = React.useState<{
    number: string;
    processNumber: string;
    object: string;
    vendorName: string;
    vendorCnpj: string;
    category: string;
    department: string;
    fiscalName: string;
    amount: string;
    startDate: string;
    deadline: string;
    status: Contract['status'];
    notes: string;
  }>({
    number: '',
    processNumber: '',
    object: '',
    vendorName: '',
    vendorCnpj: '',
    category: 'Pregão Eletrônico',
    department: 'Secretaria de Administração',
    fiscalName: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'active',
    notes: ''
  });

  const syncContractsToCloud = React.useCallback(async (nextList: Contract[]) => {
    localStorage.setItem(`@gestao360:contracts:${instKey}`, JSON.stringify(nextList));
    if (!currentInstitution?.id || isDemoEnvironment(currentInstitution as Institution | null)) return;
    try {
      const { data: instData } = await supabase
        .from('institutions')
        .select('cert_links')
        .eq('id', currentInstitution.id)
        .single();
      const baseLinks = (instData?.cert_links && typeof instData.cert_links === 'object')
        ? instData.cert_links
        : ((currentInstitution as any)?.cert_links || {});
      await supabase
        .from('institutions')
        .update({ cert_links: { ...baseLinks, __contracts: nextList } })
        .eq('id', currentInstitution.id);
    } catch (err) {
      console.warn('Erro ao sincronizar contratos na instituição:', err);
    }
  }, [currentInstitution, instKey]);

  const loadContracts = React.useCallback(async () => {
    const isDemo = isDemoEnvironment(currentInstitution as Institution | null);
    try {
      let query = supabase.from('contracts').select('*');
      if (currentInstitution?.id) query = query.eq('institution_id', currentInstitution.id);
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const mapped = data.map((c: any) => ({
          ...c,
          vendorName: c.vendor_name || c.vendorName || c.contractor || '',
          vendorCnpj: c.vendor_cnpj || c.vendorCnpj || '',
          fiscalName: c.fiscal_name || c.fiscalName || '',
          processNumber: c.process_number || c.processNumber || '',
          startDate: c.start_date || c.startDate || '',
          deadline: c.deadline || c.end_date || c.endDate || '',
          amount: Number(c.amount ?? c.value ?? 0)
        } as Contract));
        setContracts(mapped);
        localStorage.setItem(`@gestao360:contracts:${instKey}`, JSON.stringify(mapped));
        return;
      }

      // Verifica se há contratos salvos no JSONB da instituição
      if (currentInstitution?.id && !isDemo) {
        const { data: instRow } = await supabase
          .from('institutions')
          .select('cert_links')
          .eq('id', currentInstitution.id)
          .single();
        const cloudContracts = (instRow?.cert_links as any)?.__contracts;
        if (Array.isArray(cloudContracts)) {
          setContracts(cloudContracts);
          localStorage.setItem(`@gestao360:contracts:${instKey}`, JSON.stringify(cloudContracts));
          return;
        }
      }

      const localScoped = localStorage.getItem(`@gestao360:contracts:${instKey}`);
      if (localScoped) {
        try {
          setContracts(JSON.parse(localScoped));
          return;
        } catch {}
      }

      if (isDemo) {
        const demoSaved = localStorage.getItem('gestao360_demo_contracts');
        if (demoSaved) {
          try { setContracts(JSON.parse(demoSaved)); } catch { setContracts(MOCK_CONTRACTS); }
        } else {
          setContracts(MOCK_CONTRACTS);
        }
      } else {
        setContracts([]);
      }
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
      if (isDemo) setContracts(MOCK_CONTRACTS);
      else setContracts([]);
    }
  }, [currentInstitution, instKey]);

  React.useEffect(() => {
    loadContracts();
    const handleReload = (e: any) => {
      const mod = e.detail?.moduleKey || e.detail?.module;
      if (!mod || mod === 'contracts' || mod === 'all') {
        loadContracts();
      }
    };
    window.addEventListener('gestao360:reload-module', handleReload);
    return () => window.removeEventListener('gestao360:reload-module', handleReload);
  }, [loadContracts]);

  const handleLookupCnpj = async (rawCnpj: string) => {
    const clean = rawCnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      showToast('Digite os 14 números do CNPJ para consultar.', 'warning');
      return;
    }
    setIsLookingUpCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!res.ok) throw new Error('CNPJ não localizado');
      const data = await res.json();
      const name = data.razao_social || data.nome_fantasia || '';
      if (name) {
        setFormData(prev => ({ ...prev, vendorName: name }));
        showToast(`Razão Social preenchida: ${name}`, 'success');
      }
    } catch {
      showToast('Não foi possível consultar o CNPJ automaticamente. Preencha a Razão Social manualmente.', 'info');
    } finally {
      setIsLookingUpCnpj(false);
    }
  };

  const handleOpenNewModal = () => {
    setEditingContract(null);
    setFormData({
      number: `${String(contracts.length + 1).padStart(3, '0')}/${new Date().getFullYear()}`,
      processNumber: '',
      object: '',
      vendorName: '',
      vendorCnpj: '',
      category: 'Pregão Eletrônico',
      department: 'Secretaria de Administração',
      fiscalName: '',
      amount: '',
      startDate: new Date().toISOString().split('T')[0],
      deadline: '',
      status: 'active',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      number: contract.number || '',
      processNumber: contract.processNumber || '',
      object: contract.object || contract.title || '',
      vendorName: contract.vendorName || contract.contractor || '',
      vendorCnpj: contract.vendorCnpj || '',
      category: contract.category || 'Pregão Eletrônico',
      department: contract.department || 'Secretaria de Administração',
      fiscalName: contract.fiscalName || '',
      amount: contract.amount !== undefined ? String(contract.amount) : '',
      startDate: contract.startDate || '',
      deadline: contract.deadline || contract.endDate || '',
      status: contract.status || 'active',
      notes: contract.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number.trim() || !formData.object.trim() || !formData.vendorName.trim()) {
      showToast('Preencha o Nº do Contrato, Objeto e Empresa Contratada.', 'warning');
      return;
    }

    const numericAmount = Number(String(formData.amount).replace(',', '.')) || 0;
    const contractItem: Contract = {
      id: editingContract?.id || `cont_${Date.now()}`,
      number: formData.number.trim(),
      processNumber: formData.processNumber.trim(),
      object: formData.object.trim(),
      vendorName: formData.vendorName.trim(),
      vendorCnpj: formData.vendorCnpj.trim(),
      category: formData.category,
      department: formData.department.trim(),
      fiscalName: formData.fiscalName.trim(),
      amount: numericAmount,
      startDate: formData.startDate,
      deadline: formData.deadline,
      status: formData.status,
      notes: formData.notes.trim(),
      institution_id: currentInstitution?.id
    };

    const nextList = editingContract
      ? contracts.map(c => c.id === editingContract.id ? contractItem : c)
      : [contractItem, ...contracts];

    setContracts(nextList);
    await syncContractsToCloud(nextList);

    // Tenta persistir também na tabela dedicada contracts caso exista no Supabase
    if (currentInstitution?.id && !isDemoEnvironment(currentInstitution as Institution | null)) {
      const dbRow = {
        id: contractItem.id,
        number: contractItem.number,
        object: contractItem.object,
        vendor_name: contractItem.vendorName,
        amount: contractItem.amount,
        status: contractItem.status,
        category: contractItem.category,
        deadline: contractItem.deadline || null,
        institution_id: currentInstitution.id
      };
      if (editingContract) {
        await supabase.from('contracts').update(dbRow).eq('id', contractItem.id);
      } else {
        await supabase.from('contracts').insert([dbRow]);
      }
    }

    setIsModalOpen(false);
    setEditingContract(null);
    showToast(editingContract ? 'Contrato atualizado com sucesso!' : 'Novo contrato registrado com sucesso!', 'success');
  };

  const handleDeleteContract = async (contract: Contract) => {
    if (!window.confirm(`Deseja realmente excluir o Contrato nº ${contract.number} (${contract.vendorName})?`)) return;
    const nextList = contracts.filter(c => c.id !== contract.id);
    setContracts(nextList);
    await syncContractsToCloud(nextList);
    if (currentInstitution?.id && !isDemoEnvironment(currentInstitution as Institution | null)) {
      await supabase.from('contracts').delete().eq('id', contract.id);
    }
    showToast('Contrato excluído.', 'info');
  };

  const handlePrintContractsReport = () => {
    const instName = (currentInstitution as any)?.name || 'Prefeitura Municipal';
    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) {
      showToast('Habilite pop-ups para imprimir o relatório.', 'warning');
      return;
    }

    const rowsHtml = filteredContracts.map((c, idx) => `
      <tr>
        <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">${c.number || '-'}<br/><span style="font-size:10px;color:#64748b;font-weight:normal;">${c.processNumber || ''}</span></td>
        <td style="padding:8px;border:1px solid #cbd5e1;"><strong>${c.object || '-'}</strong><br/><span style="font-size:11px;color:#475569;">Contratada: ${c.vendorName || '-'} ${c.vendorCnpj ? `(${c.vendorCnpj})` : ''}</span></td>
        <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${c.category || '-'}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;">${c.department || '-'}<br/><span style="font-size:10px;color:#475569;">Fiscal: ${c.fiscalName || 'Não designado'}</span></td>
        <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">${c.deadline ? new Date(`${c.deadline}T12:00:00`).toLocaleDateString('pt-BR') : '-'}</td>
        <td style="padding:8px;border:1px solid #cbd5e1;text-align:right;font-weight:bold;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.amount) || 0)}</td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório de Contratos — ${instName}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
          .header p { margin: 4px 0 0; font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px 8px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:right;margin-bottom:12px;">
          <button onclick="window.print()" style="padding:8px 16px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Imprimir / Salvar PDF</button>
        </div>
        <div class="header">
          <h1>${instName}</h1>
          <p>Relatório de Fiscalização de Contratos Administrativos — Lei Federal nº 14.133/2021</p>
          <p>Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · Total listado: ${filteredContracts.length} contrato(s)</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nº Contrato</th>
              <th>Objeto / Contratada</th>
              <th>Modalidade</th>
              <th>Secretaria / Fiscal</th>
              <th>Vigência</th>
              <th>Valor Global</th>
            </tr>
          </thead>
          <tbody>${rowsHtml || '<tr><td colspan="7" style="padding:20px;text-align:center;">Nenhum contrato encontrado.</td></tr>'}</tbody>
        </table>
      </body>
      </html>
    `);
    win.document.close();
  };

  // Indicadores e Diagnóstico Lei 14.133/2021
  const totalVolume = contracts.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const criticalRisks = contracts.filter(c => c.status === 'risk').length;
  const expiring30Count = contracts.filter(c => {
    const days = getDaysUntilDeadline(c.deadline);
    return days !== null && days >= 0 && days <= 30 && c.status !== 'expired';
  }).length;
  const expiredActiveCount = contracts.filter(c => {
    const days = getDaysUntilDeadline(c.deadline);
    return (days !== null && days < 0) || c.status === 'expired';
  }).length;
  const withoutFiscalCount = contracts.filter(c => !c.fiscalName || !c.fiscalName.trim()).length;
  const dispensaVolume = contracts
    .filter(c => (c.category || '').toLowerCase().includes('dispensa'))
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const dispensaPercent = totalVolume > 0 ? Math.round((dispensaVolume / totalVolume) * 100) : 0;
  const governanceScore = contracts.length > 0
    ? `${Math.max(0, Math.round(((contracts.length - criticalRisks) / contracts.length) * 100))}%`
    : '100%';

  const filteredContracts = contracts.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (c.number || '').toLowerCase().includes(q) ||
      (c.object || '').toLowerCase().includes(q) ||
      (c.vendorName || '').toLowerCase().includes(q) ||
      (c.vendorCnpj || '').toLowerCase().includes(q) ||
      (c.fiscalName || '').toLowerCase().includes(q) ||
      (c.department || '').toLowerCase().includes(q);

    const matchesCategory = categoryFilter === 'Todas' || c.category === categoryFilter;

    if (!matchesSearch || !matchesCategory) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'expiring30') {
      const days = getDaysUntilDeadline(c.deadline);
      return days !== null && days >= 0 && days <= 30 && c.status !== 'expired';
    }
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">
            Licitações & <span className="text-neutral-400 font-normal">Contratos</span>
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Fiscalização contratual, vigências e conformidade com a Lei Federal nº 14.133/2021.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DemoFillButton moduleKey="contracts" currentInstitution={currentInstitution as Institution | null} onSuccess={loadContracts} />
          <button
            onClick={handlePrintContractsReport}
            className="bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all flex items-center gap-2"
          >
            <Printer size={16} /> Relatório Oficial (PDF)
          </button>
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2"
          >
            <ShieldAlert size={16} /> Auditoria Lei 14.133
          </button>
          {canEdit && (
            <button
              onClick={handleOpenNewModal}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-neutral-900/10 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Novo Contrato
            </button>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Volume Total Contratado',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalVolume),
            sub: `${contracts.length} contrato(s) cadastrado(s)`,
            icon: TrendingUp,
            color: 'text-neutral-900 dark:text-neutral-100'
          },
          {
            label: 'Riscos / Vencendo 30d',
            value: `${criticalRisks} / ${expiring30Count}`,
            sub: 'Críticos / Próximos do vencimento',
            icon: AlertTriangle,
            color: criticalRisks > 0 || expiring30Count > 0 ? 'text-rose-500' : 'text-emerald-500'
          },
          {
            label: 'Dispensas (Art. 75)',
            value: `${dispensaPercent}%`,
            sub: 'Participação no volume global',
            icon: Target,
            color: 'text-amber-500'
          },
          {
            label: 'Índice de Regularidade',
            value: governanceScore,
            sub: 'Score de Governança Contratual',
            icon: CheckCircle2,
            color: 'text-emerald-500'
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
            <stat.icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-5 transition-transform group-hover:scale-110 duration-500 ${stat.color}`} />
            <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-tight mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por Nº do contrato, objeto, empresa, CNPJ, secretaria ou fiscal..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {([
            { id: 'all', label: `Todos (${contracts.length})` },
            { id: 'active', label: 'Regulares' },
            { id: 'expiring30', label: `Vencendo 30d (${expiring30Count})` },
            { id: 'review', label: 'Em Auditoria' },
            { id: 'risk', label: `Críticos (${criticalRisks})` },
            { id: 'expired', label: 'Encerrados' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 outline-none"
          >
            <option value="Todas">Todas as Modalidades</option>
            {CONTRACT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABELA DE CONTRATOS */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-6 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Nº Contrato</th>
                <th className="px-6 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Objeto / Empresa Contratada</th>
                <th className="px-6 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-center">Modalidade</th>
                <th className="px-6 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-center">Vigência / Fiscal</th>
                <th className="px-6 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-right">Valor Global</th>
                <th className="px-6 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center">
                    <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
                      Nenhum contrato encontrado para os filtros selecionados.
                    </p>
                    {canEdit && contracts.length === 0 && (
                      <button
                        onClick={handleOpenNewModal}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black uppercase tracking-wider"
                      >
                        <Plus size={14} /> Cadastrar Primeiro Contrato da Prefeitura
                      </button>
                    )}
                  </td>
                </tr>
              ) : filteredContracts.map((contract) => {
                const daysLeft = getDaysUntilDeadline(contract.deadline);
                return (
                  <tr key={contract.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors group">
                    <td className="px-6 py-5">
                      <span className="text-xs font-black text-neutral-900 dark:text-neutral-100 block">
                        {contract.number}
                      </span>
                      {contract.processNumber && (
                        <span className="text-[10px] font-mono text-neutral-400">
                          Proc: {contract.processNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 leading-tight">
                          {contract.object}
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-1">
                          {contract.vendorName}
                          {contract.vendorCnpj ? ` · CNPJ: ${contract.vendorCnpj}` : ''}
                        </span>
                        {contract.department && (
                          <span className="text-[10px] text-neutral-400 mt-0.5">{contract.department}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-[10px] font-black text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full uppercase tracking-wider">
                        {contract.category || 'Licitação'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {contract.deadline ? new Date(`${contract.deadline}T12:00:00`).toLocaleDateString('pt-BR') : 'Indeterminado'}
                        </span>
                        {daysLeft !== null && contract.status !== 'expired' && (
                          <span className={`text-[10px] font-bold mt-0.5 ${
                            daysLeft < 0 ? 'text-rose-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-neutral-400'
                          }`}>
                            {daysLeft < 0 ? `Vencido há ${Math.abs(daysLeft)}d` : `Vence em ${daysLeft}d`}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          Fiscal: {contract.fiscalName || 'Não designado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center">
                        <span className={`text-[10px] uppercase font-black px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 ${
                          contract.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          contract.status === 'risk' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse' :
                          contract.status === 'review' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            contract.status === 'active' ? 'bg-emerald-500' :
                            contract.status === 'risk' ? 'bg-rose-500' :
                            contract.status === 'review' ? 'bg-amber-500' : 'bg-neutral-400'
                          }`} />
                          {contract.status === 'active' ? 'Regular' :
                           contract.status === 'risk' ? 'Crítico' :
                           contract.status === 'review' ? 'Auditoria' : 'Encerrado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(contract.amount) || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setViewingContract(contract)}
                          title="Ver Ficha Completa de Fiscalização"
                          className="p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition"
                        >
                          <Eye size={14} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(contract)}
                            title="Editar Contrato"
                            className="p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteContract(contract)}
                            title="Excluir Contrato"
                            className="p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BANNER CONTROLADORIA PREVENTIVA */}
      <div className="bg-neutral-900 p-10 sm:p-12 rounded-[40px] relative overflow-hidden shadow-2xl shadow-neutral-900/20">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <ShieldAlert size={140} className="text-white" />
        </div>
        <div className="max-w-xl space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            Controladoria Preventiva — Lei 14.133/2021
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight italic">
            Diagnóstico de <span className="text-neutral-400 font-normal">Conformidade & Riscos</span>
          </h3>
          <p className="text-neutral-400 text-sm leading-relaxed font-medium">
            Verifique automaticamente contratos próximos do vencimento, ausência de fiscal formalmente designado (Art. 117) e concentração em dispensas de licitação (Art. 75).
          </p>
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="bg-white text-neutral-900 px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transform hover:-translate-y-0.5 transition-all shadow-xl shadow-black/50"
          >
            Abrir Diagnóstico Lupa 360
          </button>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE CONTRATO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-1">
              {editingContract ? `Editar Contrato ${editingContract.number}` : 'Novo Contrato Administrativo'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              Registro oficial vinculado a {(currentInstitution as any)?.name || 'sua prefeitura'} conforme a Lei 14.133/2021.
            </p>

            <form onSubmit={handleSaveContract} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Nº do Contrato *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 015/2026"
                    value={formData.number}
                    onChange={e => setFormData({ ...formData, number: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 font-bold text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Nº Processo Adm.</label>
                  <input
                    type="text"
                    placeholder="Ex: PA 089/2026"
                    value={formData.processNumber}
                    onChange={e => setFormData({ ...formData, processNumber: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Modalidade (Lei 14.133)</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 font-bold text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    {CONTRACT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300">Objeto do Contrato *</label>
                <input
                  required
                  type="text"
                  placeholder="Descrição clara do objeto contratado..."
                  value={formData.object}
                  onChange={e => setFormData({ ...formData, object: e.target.value })}
                  className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">CNPJ da Contratada</label>
                  <div className="mt-1.5 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={formData.vendorCnpj}
                      onChange={e => {
                        const formatted = formatCnpj(e.target.value);
                        setFormData({ ...formData, vendorCnpj: formatted });
                        if (formatted.replace(/\D/g, '').length === 14 && !formData.vendorName) {
                          handleLookupCnpj(formatted);
                        }
                      }}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 font-mono text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleLookupCnpj(formData.vendorCnpj)}
                      disabled={isLookingUpCnpj}
                      className="px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold text-[11px] shrink-0 hover:bg-emerald-100 transition"
                    >
                      {isLookingUpCnpj ? '...' : 'Buscar'}
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-7">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Razão Social da Contratada *</label>
                  <input
                    required
                    type="text"
                    placeholder="Nome empresarial da empresa vencedora"
                    value={formData.vendorName}
                    onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 font-bold text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Secretaria Gestora</label>
                  <input
                    type="text"
                    placeholder="Ex: Secretaria Municipal de Saúde"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Fiscal do Contrato (Art. 117)</label>
                  <input
                    type="text"
                    placeholder="Nome e matrícula/portaria do servidor fiscal"
                    value={formData.fiscalName}
                    onChange={e => setFormData({ ...formData, fiscalName: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Valor Global (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 font-bold text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Início da Vigência</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Fim da Vigência</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as Contract['status'] })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 font-bold text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    <option value="active">Regular (Vigente)</option>
                    <option value="review">Em Auditoria</option>
                    <option value="risk">Crítico / Risco</option>
                    <option value="expired">Encerrado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300">Observações da Fiscalização / Aditivos</label>
                <textarea
                  rows={2}
                  placeholder="Anotações sobre execução contratual, empenhos vinculados ou termos aditivos..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-black shadow-lg"
                >
                  {editingContract ? 'Salvar Alterações' : 'Registrar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FICHA DE FISCALIZAÇÃO DO CONTRATO */}
      {viewingContract && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative">
            <button
              onClick={() => setViewingContract(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <X size={18} />
            </button>

            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {viewingContract.category || 'Contrato Administrativo'}
            </span>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-3">
              Contrato nº {viewingContract.number}
            </h3>
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 mt-1">
              {viewingContract.object}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Empresa Contratada</span>
                <strong className="text-neutral-900 dark:text-white">{viewingContract.vendorName}</strong>
                {viewingContract.vendorCnpj && <p className="text-[11px] font-mono text-neutral-500">{viewingContract.vendorCnpj}</p>}
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Valor Global</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(viewingContract.amount) || 0)}
                </strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Secretaria Gestora</span>
                <strong className="text-neutral-900 dark:text-white">{viewingContract.department || 'Não informada'}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Fiscal Designado (Art. 117)</span>
                <strong className="text-neutral-900 dark:text-white">{viewingContract.fiscalName || 'Não designado'}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Processo Administrativo</span>
                <strong className="text-neutral-900 dark:text-white">{viewingContract.processNumber || 'Não informado'}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Vigência Final</span>
                <strong className="text-neutral-900 dark:text-white">
                  {viewingContract.deadline ? new Date(`${viewingContract.deadline}T12:00:00`).toLocaleDateString('pt-BR') : 'Indeterminada'}
                </strong>
              </div>
            </div>

            {viewingContract.notes && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-neutral-700 dark:text-neutral-300">
                <strong className="block text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                  Anotações da Fiscalização
                </strong>
                {viewingContract.notes}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {canEdit && (
                <button
                  onClick={() => {
                    const c = viewingContract;
                    setViewingContract(null);
                    handleOpenEditModal(c);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black"
                >
                  Editar Contrato
                </button>
              )}
              <button
                onClick={() => setViewingContract(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUDITORIA RÁPIDA LEI 14.133/2021 */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative">
            <button
              onClick={() => setIsAuditModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  Diagnóstico de Conformidade — Lei 14.133/2021
                </h3>
                <p className="text-xs text-neutral-500">
                  Verificação automática da carteira de contratos de {(currentInstitution as any)?.name || 'sua prefeitura'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white">Designação Formal de Fiscal (Art. 117)</p>
                  <p className="text-neutral-500">Todo contrato administrativo exige representante da Administração formalmente designado.</p>
                </div>
                <span className={`px-3 py-1 rounded-full font-black ${
                  withoutFiscalCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {withoutFiscalCount === 0 ? '100% OK' : `${withoutFiscalCount} sem fiscal`}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white">Alerta de Vigência (Próximos 30 dias)</p>
                  <p className="text-neutral-500">Contratos que exigem termo aditivo de prazo ou nova licitação imediata.</p>
                </div>
                <span className={`px-3 py-1 rounded-full font-black ${
                  expiring30Count === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {expiring30Count} contrato(s)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white">Proporção de Dispensas (Art. 75)</p>
                  <p className="text-neutral-500">Monitoramento preventivo contra fracionamento indevido de despesa.</p>
                </div>
                <span className="px-3 py-1 rounded-full font-black bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {dispensaPercent}% do volume
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white">Contratos em Risco Crítico / Vencidos</p>
                  <p className="text-neutral-500">Contratos sinalizados com pendência jurídica ou vigência expirada.</p>
                </div>
                <span className={`px-3 py-1 rounded-full font-black ${
                  criticalRisks === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {criticalRisks} crítico(s) · {expiredActiveCount} encerrado(s)
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAuditModalOpen(false);
                  handlePrintContractsReport();
                }}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black flex items-center gap-1.5"
              >
                <Printer size={14} /> Imprimir Relatório de Auditoria
              </button>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { ContractsModule };
