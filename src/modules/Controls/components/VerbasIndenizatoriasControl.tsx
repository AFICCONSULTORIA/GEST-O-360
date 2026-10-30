import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DollarSign, CheckCircle2, Clock, AlertTriangle, XCircle, Plus, Search, 
  Filter, FileText, Download, Calendar, UserCheck, ShieldCheck, Trash2, Edit2, 
  ChevronLeft, ChevronRight, X, Printer, RefreshCw, Upload, Check, Landmark, Building2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AdminUser, Institution } from '../../../types';
import { showToast } from '../../../components/ui/Toast';
import { REAL_VERBAS_INDENIZATORIAS_DATA } from '../data/realVerbasIndenizatorias';

export interface VerbaIndenizatoriaItem {
  id: string;
  institution_id: string;
  month_id: string; // Ex: '2026-10'
  servidor_nome: string;
  cargo: string;
  matricula?: string;
  secretaria_setor?: string;
  valor: number;
  entregou_requerimento: boolean;
  data_requerimento?: string;
  entregou_relatorio: boolean;
  data_relatorio?: string;
  status_aprovacao: 'pendente' | 'em_analise' | 'regular' | 'irregular';
  observacoes?: string;
  created_at?: string;
}

interface VerbasIndenizatoriasControlProps {
  currentUser?: AdminUser | null;
  currentInstitution?: Institution | null;
  searchQuery?: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getCurrentMonthId = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (monthId: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!match) return monthId;
  const year = match[1];
  const idx = parseInt(match[2], 10) - 1;
  return `${MONTH_NAMES[idx] || match[2]}/${year}`;
};

const formatShortMonth = (monthId: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!match) return monthId;
  const yearShort = match[1].slice(2);
  const idx = parseInt(match[2], 10) - 1;
  return `${(MONTH_NAMES[idx] || '').slice(0, 3)}/${yearShort}`;
};

const addMonths = (monthId: string, delta: number): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!match) return getCurrentMonthId();
  const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const VerbasIndenizatoriasControl: React.FC<VerbasIndenizatoriasControlProps> = ({
  currentUser,
  currentInstitution,
  searchQuery = ''
}) => {
  const instId = currentInstitution?.id || 'default';
  const currentOperationalMonth = useMemo(() => getCurrentMonthId(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentOperationalMonth);

  const [items, setItems] = useState<VerbaIndenizatoriaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>(searchQuery);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [complianceFilter, setComplianceFilter] = useState<'todos' | 'completo' | 'pendente_ambos' | 'pendente_req' | 'pendente_rel'>('todos');

  // Modal de cadastro / edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VerbaIndenizatoriaItem | null>(null);

  // Form states
  const [formServidor, setFormServidor] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formMatricula, setFormMatricula] = useState('');
  const [formSecretaria, setFormSecretaria] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formEntregouReq, setFormEntregouReq] = useState(false);
  const [formDataReq, setFormDataReq] = useState('');
  const [formEntregouRel, setFormEntregouRel] = useState(false);
  const [formDataRel, setFormDataRel] = useState('');
  const [formStatus, setFormStatus] = useState<VerbaIndenizatoriaItem['status_aprovacao']>('pendente');
  const [formObservacoes, setFormObservacoes] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const parseBRL = (valStr: string): number => {
    if (!valStr) return 0;
    const s = valStr.toString().replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(s) || 0;
  };

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

  // Carregamento de registros da competência selecionada
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    const storageKey = `ctrl_verbas_${instId}_${selectedMonth}`;
    let localData: VerbaIndenizatoriaItem[] = [];

    try {
      const rawLocal = localStorage.getItem(storageKey);
      if (rawLocal) {
        localData = JSON.parse(rawLocal);
        setItems(localData);
      }
    } catch {
      // ignore
    }

    try {
      const { data, error } = await supabase
        .from('ctrl_verbas_indenizatorias')
        .select('*')
        .eq('institution_id', instId)
        .eq('month_id', selectedMonth)
        .order('servidor_nome', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mapped: VerbaIndenizatoriaItem[] = data.map(d => ({
          id: d.id,
          institution_id: d.institution_id || instId,
          month_id: d.month_id,
          servidor_nome: d.servidor_nome,
          cargo: d.cargo,
          matricula: d.matricula || '',
          secretaria_setor: d.secretaria_setor || '',
          valor: Number(d.valor) || 0,
          entregou_requerimento: Boolean(d.entregou_requerimento),
          data_requerimento: d.data_requerimento || '',
          entregou_relatorio: Boolean(d.entregou_relatorio),
          data_relatorio: d.data_relatorio || '',
          status_aprovacao: d.status_aprovacao || 'pendente',
          observacoes: d.observacoes || '',
          created_at: d.created_at
        }));
        setItems(mapped);
        localStorage.setItem(storageKey, JSON.stringify(mapped));
      } else if (localData.length === 0 || localData.some(i => i.id.startsWith('mock-'))) {
        // Carrega a listagem real dos servidores e cargos do município
        const initialReal: VerbaIndenizatoriaItem[] = REAL_VERBAS_INDENIZATORIAS_DATA.map((seed, idx) => {
          let status_aprovacao: VerbaIndenizatoriaItem['status_aprovacao'] = 'pendente';
          if (seed.entregou_requerimento && seed.entregou_relatorio) {
            status_aprovacao = 'regular';
          } else if (seed.entregou_requerimento || seed.entregou_relatorio) {
            status_aprovacao = 'em_analise';
          }

          return {
            id: `real-${selectedMonth}-${idx + 1}`,
            institution_id: instId,
            month_id: selectedMonth,
            servidor_nome: seed.servidor_nome,
            cargo: seed.cargo,
            matricula: `MAT-${1000 + idx + 1}`,
            secretaria_setor: seed.secretaria_setor || '',
            valor: seed.valor || 3500.00,
            entregou_requerimento: seed.entregou_requerimento,
            data_requerimento: seed.entregou_requerimento ? `${selectedMonth}-05` : '',
            entregou_relatorio: seed.entregou_relatorio,
            data_relatorio: seed.entregou_relatorio ? `${selectedMonth}-28` : '',
            status_aprovacao,
            observacoes: seed.entregou_requerimento && !seed.entregou_relatorio 
              ? 'Requerimento protocolado; aguardando entrega do relatório de atividades.'
              : !seed.entregou_requerimento && !seed.entregou_relatorio
              ? 'Documentação pendente de protocolo pelo responsável.'
              : 'Documentos entregues e validados.'
          };
        });

        setItems(initialReal);
        localStorage.setItem(storageKey, JSON.stringify(initialReal));
      }
    } catch (err) {
      console.warn('Erro ao consultar Supabase, mantendo dados locais:', err);
    } finally {
      setIsLoading(false);
    }
  }, [instId, selectedMonth]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Salvar alterações de um item (Persistência Dupla: Supabase + Local)
  const saveItem = async (item: VerbaIndenizatoriaItem) => {
    const storageKey = `ctrl_verbas_${instId}_${selectedMonth}`;
    setItems(prev => {
      const exists = prev.some(i => i.id === item.id);
      const updated = exists ? prev.map(i => (i.id === item.id ? item : i)) : [item, ...prev];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    try {
      await supabase
        .from('ctrl_verbas_indenizatorias')
        .upsert({
          id: item.id.startsWith('mock-') || item.id.startsWith('temp-') ? undefined : item.id,
          institution_id: instId,
          month_id: item.month_id,
          servidor_nome: item.servidor_nome,
          cargo: item.cargo,
          matricula: item.matricula || null,
          secretaria_setor: item.secretaria_setor || null,
          valor: item.valor,
          entregou_requerimento: item.entregou_requerimento,
          data_requerimento: item.data_requerimento || null,
          entregou_relatorio: item.entregou_relatorio,
          data_relatorio: item.data_relatorio || null,
          status_aprovacao: item.status_aprovacao,
          observacoes: item.observacoes || null,
          updated_by: currentUser?.id || currentUser?.email || 'admin'
        });
    } catch (e) {
      console.warn('Falha ao enviar ao Supabase, salvo localmente:', e);
    }
  };

  // Toggle rápido de Requerimento e Relatório diretamente na tabela
  const handleToggleRequerimento = (item: VerbaIndenizatoriaItem) => {
    const nextVal = !item.entregou_requerimento;
    const updated: VerbaIndenizatoriaItem = {
      ...item,
      entregou_requerimento: nextVal,
      data_requerimento: nextVal ? (item.data_requerimento || new Date().toISOString().split('T')[0]) : '',
      status_aprovacao: (nextVal && item.entregou_relatorio) ? 'regular' : item.status_aprovacao === 'regular' ? 'em_analise' : item.status_aprovacao
    };
    saveItem(updated);
    showToast(nextVal ? `Requerimento de ${item.servidor_nome} marcado como entregue!` : `Requerimento de ${item.servidor_nome} desmarcado.`, 'success');
  };

  const handleToggleRelatorio = (item: VerbaIndenizatoriaItem) => {
    const nextVal = !item.entregou_relatorio;
    const updated: VerbaIndenizatoriaItem = {
      ...item,
      entregou_relatorio: nextVal,
      data_relatorio: nextVal ? (item.data_relatorio || new Date().toISOString().split('T')[0]) : '',
      status_aprovacao: (nextVal && item.entregou_requerimento) ? 'regular' : item.status_aprovacao === 'regular' ? 'em_analise' : item.status_aprovacao
    };
    saveItem(updated);
    showToast(nextVal ? `Relatório de ${item.servidor_nome} marcado como entregue!` : `Relatório de ${item.servidor_nome} desmarcado.`, 'success');
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Deseja excluir este registro de verba indenizatória?')) return;
    const storageKey = `ctrl_verbas_${instId}_${selectedMonth}`;
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });

    try {
      await supabase.from('ctrl_verbas_indenizatorias').delete().eq('id', id);
    } catch {
      // ignore
    }
    showToast('Registro excluído com sucesso.');
  };

  const handleOpenModal = (item?: VerbaIndenizatoriaItem) => {
    if (item) {
      setEditingItem(item);
      setFormServidor(item.servidor_nome);
      setFormCargo(item.cargo);
      setFormMatricula(item.matricula || '');
      setFormSecretaria(item.secretaria_setor || '');
      setFormValor(applyCurrencyMask(Math.round(item.valor * 100).toString()));
      setFormEntregouReq(item.entregou_requerimento);
      setFormDataReq(item.data_requerimento || '');
      setFormEntregouRel(item.entregou_relatorio);
      setFormDataRel(item.data_relatorio || '');
      setFormStatus(item.status_aprovacao);
      setFormObservacoes(item.observacoes || '');
    } else {
      setEditingItem(null);
      setFormServidor('');
      setFormCargo('');
      setFormMatricula('');
      setFormSecretaria('');
      setFormValor('');
      setFormEntregouReq(false);
      setFormDataReq('');
      setFormEntregouRel(false);
      setFormDataRel('');
      setFormStatus('pendente');
      setFormObservacoes('');
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formServidor.trim() || !formCargo.trim()) {
      showToast('Preencha o nome do servidor e o cargo.', 'warning');
      return;
    }

    const valNum = parseBRL(formValor);

    // Auto-ajuste de status: se entregou requerimento E relatório, sugere regular
    let statusFinal = formStatus;
    if (formEntregouReq && formEntregouRel && statusFinal === 'pendente') {
      statusFinal = 'regular';
    }

    const itemToSave: VerbaIndenizatoriaItem = {
      id: editingItem ? editingItem.id : `temp-${Date.now()}`,
      institution_id: instId,
      month_id: selectedMonth,
      servidor_nome: formServidor.trim(),
      cargo: formCargo.trim(),
      matricula: formMatricula.trim() || undefined,
      secretaria_setor: formSecretaria.trim() || undefined,
      valor: valNum,
      entregou_requerimento: formEntregouReq,
      data_requerimento: formEntregouReq ? (formDataReq || new Date().toISOString().split('T')[0]) : undefined,
      entregou_relatorio: formEntregouRel,
      data_relatorio: formEntregouRel ? (formDataRel || new Date().toISOString().split('T')[0]) : undefined,
      status_aprovacao: statusFinal,
      observacoes: formObservacoes.trim() || undefined
    };

    saveItem(itemToSave);
    setIsModalOpen(false);
    showToast(`Registro de ${itemToSave.servidor_nome} salvo com sucesso!`, 'success');
  };

  // Métricas e Totais do Mês
  const totalBeneficiarios = items.length;
  const totalValor = useMemo(() => items.reduce((sum, i) => sum + i.valor, 0), [items]);
  const totalEntregouReq = useMemo(() => items.filter(i => i.entregou_requerimento).length, [items]);
  const totalEntregouRel = useMemo(() => items.filter(i => i.entregou_relatorio).length, [items]);
  const totalConforme = useMemo(() => items.filter(i => i.entregou_requerimento && i.entregou_relatorio).length, [items]);
  const totalPendentes = totalBeneficiarios - totalConforme;
  const percentConforme = totalBeneficiarios > 0 ? Math.round((totalConforme / totalBeneficiarios) * 100) : 0;

  // Filtragem da Lista
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Busca textual
      const q = (searchTerm || searchQuery).toLowerCase().trim();
      if (q) {
        const matchesName = item.servidor_nome.toLowerCase().includes(q);
        const matchesCargo = item.cargo.toLowerCase().includes(q);
        const matchesMatr = (item.matricula || '').toLowerCase().includes(q);
        const matchesSec = (item.secretaria_setor || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCargo && !matchesMatr && !matchesSec) return false;
      }

      // Filtro de Status
      if (statusFilter !== 'todos' && item.status_aprovacao !== statusFilter) return false;

      // Filtro de Entregas (Compliance)
      if (complianceFilter === 'completo') {
        if (!item.entregou_requerimento || !item.entregou_relatorio) return false;
      } else if (complianceFilter === 'pendente_ambos') {
        if (item.entregou_requerimento || item.entregou_relatorio) return false;
      } else if (complianceFilter === 'pendente_req') {
        if (item.entregou_requerimento) return false;
      } else if (complianceFilter === 'pendente_rel') {
        if (item.entregou_relatorio) return false;
      }

      return true;
    });
  }, [items, searchTerm, searchQuery, statusFilter, complianceFilter]);

  const activeMonthLabel = formatMonthLabel(selectedMonth);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-['Inter']">
      
      {/* 1. CABEÇALHO DO MÓDULO & SELETOR DE MÊS A MÊS */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign size={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Controle Preventivo & Auditoria Interna
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                Resolução TCE & LRF
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white tracking-tight font-['Montserrat'] mt-0.5">
              Controle de Verbas Indenizatórias
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-0.5 max-w-2xl">
              Acompanhamento mensal da entrega de requerimentos e relatórios de atividades para regularidade das verbas indenizatórias de secretários e cargos comissionados.
            </p>
          </div>
        </div>

        {/* Seletor Mês a Mês & Botão Novo */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setSelectedMonth(prev => addMonths(prev, -1))}
              className="p-2 hover:bg-white dark:hover:bg-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3 font-black text-xs text-neutral-800 dark:text-white uppercase tracking-wider">
              <Calendar size={14} className="text-emerald-500" />
              <span>{activeMonthLabel}</span>
            </div>
            <button
              onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
              className="p-2 hover:bg-white dark:hover:bg-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => {
              const storageKey = `ctrl_verbas_${instId}_${selectedMonth}`;
              const initialReal: VerbaIndenizatoriaItem[] = REAL_VERBAS_INDENIZATORIAS_DATA.map((seed, idx) => {
                let status_aprovacao: VerbaIndenizatoriaItem['status_aprovacao'] = 'pendente';
                if (seed.entregou_requerimento && seed.entregou_relatorio) {
                  status_aprovacao = 'regular';
                } else if (seed.entregou_requerimento || seed.entregou_relatorio) {
                  status_aprovacao = 'em_analise';
                }

                return {
                  id: `real-${selectedMonth}-${idx + 1}`,
                  institution_id: instId,
                  month_id: selectedMonth,
                  servidor_nome: seed.servidor_nome,
                  cargo: seed.cargo,
                  matricula: `MAT-${1000 + idx + 1}`,
                  secretaria_setor: seed.secretaria_setor || '',
                  valor: seed.valor || 3500.00,
                  entregou_requerimento: seed.entregou_requerimento,
                  data_requerimento: seed.entregou_requerimento ? `${selectedMonth}-05` : '',
                  entregou_relatorio: seed.entregou_relatorio,
                  data_relatorio: seed.entregou_relatorio ? `${selectedMonth}-28` : '',
                  status_aprovacao,
                  observacoes: seed.entregou_requerimento && !seed.entregou_relatorio 
                    ? 'Requerimento protocolado; aguardando entrega do relatório de atividades.'
                    : !seed.entregou_requerimento && !seed.entregou_relatorio
                    ? 'Documentação pendente de protocolo pelo responsável.'
                    : 'Documentos entregues e validados.'
                };
              });
              setItems(initialReal);
              localStorage.setItem(storageKey, JSON.stringify(initialReal));
              showToast(`Lista oficial de 32 servidores carregada em ${activeMonthLabel}!`, 'success');
            }}
            className="flex items-center gap-2 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            title="Recarregar dados reais da prefeitura para este mês"
          >
            <RefreshCw size={15} /> Restaurar Lista Oficial
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Novo Servidor
          </button>
        </div>
      </div>

      {/* 2. CARDS DE KPIS MENSAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Beneficiários */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Beneficiários no Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-bold">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-3xl font-black font-['Montserrat'] text-neutral-900 dark:text-white">
              {totalBeneficiarios}
            </h4>
            <p className="text-[11px] text-neutral-400 mt-1">
              Montante: <strong className="text-neutral-700 dark:text-neutral-300">{formatCurrency(totalValor)}</strong>
            </p>
          </div>
        </div>

        {/* Card 2: Requerimentos Entregues */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Requerimentos Entregues
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              totalEntregouReq === totalBeneficiarios && totalBeneficiarios > 0
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
            }`}>
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-3xl font-black font-['Montserrat'] text-neutral-900 dark:text-white">
                {totalEntregouReq}
              </h4>
              <span className="text-xs text-neutral-400 font-bold">/ {totalBeneficiarios}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${totalBeneficiarios > 0 ? (totalEntregouReq / totalBeneficiarios) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Relatórios Entregues */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Relatórios Entregues
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              totalEntregouRel === totalBeneficiarios && totalBeneficiarios > 0
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
            }`}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-3xl font-black font-['Montserrat'] text-neutral-900 dark:text-white">
                {totalEntregouRel}
              </h4>
              <span className="text-xs text-neutral-400 font-bold">/ {totalBeneficiarios}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${totalBeneficiarios > 0 ? (totalEntregouRel / totalBeneficiarios) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Taxa de Regularidade */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Conformidade Total
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <h4 className={`text-3xl font-black font-['Montserrat'] ${
                percentConforme >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {percentConforme}%
              </h4>
              <span className="text-[11px] font-bold text-neutral-500">
                {totalConforme} de {totalBeneficiarios} regulares
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              {totalPendentes === 0 ? 'Todas as exigências cumpridas!' : `${totalPendentes} pendência(s) de entrega`}
            </p>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS E PESQUISA */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-4 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nome do servidor, cargo, secretaria ou matrícula..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Entrega de Documentos */}
          <select
            value={complianceFilter}
            onChange={e => setComplianceFilter(e.target.value as any)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-neutral-700 dark:text-neutral-200 outline-none cursor-pointer"
          >
            <option value="todos">Todas as Entregas</option>
            <option value="completo">Totalmente Regulares (Req + Relatório)</option>
            <option value="pendente_req">Pendente Requerimento</option>
            <option value="pendente_rel">Pendente Relatório</option>
            <option value="pendente_ambos">Pendente Ambos</option>
          </select>

          {/* Filtro de Status de Aprovação */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-neutral-700 dark:text-neutral-200 outline-none cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="regular">Regular</option>
            <option value="em_analise">Em Análise</option>
            <option value="pendente">Pendente</option>
            <option value="irregular">Irregular</option>
          </select>

          <button
            onClick={() => window.print()}
            className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-2xl transition-colors cursor-pointer"
            title="Imprimir relatório mensal"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* 4. TABELA DE CONTROLE MÊS A MÊS */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
              Demonstrativo de Beneficiários — {activeMonthLabel}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {filteredItems.length} registro(s)
            </span>
          </div>
          <span className="text-xs font-bold text-neutral-500">
            Clique nos ícones de <strong className="text-emerald-600 dark:text-emerald-400">Requerimento</strong> e <strong className="text-blue-600 dark:text-blue-400">Relatório</strong> para alternar entrega rápida.
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 space-y-3">
            <DollarSign size={40} className="mx-auto text-neutral-300 dark:text-neutral-700" />
            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
              Nenhum servidor cadastrado para {activeMonthLabel}
            </p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Cadastre secretários, diretores ou assessores que recebem verba indenizatória para controlar os relatórios de comprovação.
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus size={14} /> Cadastrar Servidor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400 bg-neutral-50/30 dark:bg-neutral-900/60">
                  <th className="py-3 px-4">Servidor / Matrícula</th>
                  <th className="py-3 px-4">Cargo & Secretaria</th>
                  <th className="py-3 px-4 text-right">Valor da Verba</th>
                  <th className="py-3 px-4 text-center">Requerimento</th>
                  <th className="py-3 px-4 text-center">Relatório de Atividades</th>
                  <th className="py-3 px-4 text-center">Conformidade</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredItems.map(item => {
                  const isFullyCompliant = item.entregou_requerimento && item.entregou_relatorio;
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      {/* Nome e Matrícula */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 dark:text-white text-sm">
                          {item.servidor_nome}
                        </div>
                        {item.matricula && (
                          <div className="text-[10px] text-neutral-400 font-mono">
                            Matrícula: {item.matricula}
                          </div>
                        )}
                      </td>

                      {/* Cargo e Secretaria */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-700 dark:text-neutral-200">
                          {item.cargo}
                        </div>
                        {item.secretaria_setor && (
                          <div className="text-[11px] text-neutral-400">
                            {item.secretaria_setor}
                          </div>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 text-right font-black font-['Montserrat'] text-neutral-900 dark:text-white">
                        {formatCurrency(item.valor)}
                      </td>

                      {/* Checkbox / Botão de Requerimento */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleRequerimento(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                            item.entregou_requerimento
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                          }`}
                          title={item.entregou_requerimento ? 'Clique para desmarcar' : 'Clique para marcar como entregue'}
                        >
                          {item.entregou_requerimento ? (
                            <>
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              <span>Entregue</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={13} className="text-rose-500" />
                              <span>Pendente</span>
                            </>
                          )}
                        </button>
                        {item.data_requerimento && (
                          <span className="block text-[9px] text-neutral-400 mt-0.5">
                            {item.data_requerimento.split('-').reverse().join('/')}
                          </span>
                        )}
                      </td>

                      {/* Checkbox / Botão de Relatório */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleRelatorio(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                            item.entregou_relatorio
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 shadow-xs'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
                          }`}
                          title={item.entregou_relatorio ? 'Clique para desmarcar' : 'Clique para marcar como entregue'}
                        >
                          {item.entregou_relatorio ? (
                            <>
                              <CheckCircle2 size={13} className="text-blue-500" />
                              <span>Entregue</span>
                            </>
                          ) : (
                            <>
                              <Clock size={13} className="text-amber-500" />
                              <span>Pendente</span>
                            </>
                          )}
                        </button>
                        {item.data_relatorio && (
                          <span className="block text-[9px] text-neutral-400 mt-0.5">
                            {item.data_relatorio.split('-').reverse().join('/')}
                          </span>
                        )}
                      </td>

                      {/* Status de Conformidade */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isFullyCompliant
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : item.status_aprovacao === 'em_analise'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : item.status_aprovacao === 'irregular'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {isFullyCompliant ? 'Regular' : item.status_aprovacao === 'em_analise' ? 'Em Análise' : item.status_aprovacao === 'irregular' ? 'Irregular' : 'Incompleto'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar dados"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {activeMonthLabel}
                </span>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  {editingItem ? 'Editar Beneficiário de Verba' : 'Cadastrar Beneficiário'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                  Nome Completo do Servidor *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={formServidor}
                  onChange={e => setFormServidor(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                    Cargo / Função *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Secretário Municipal"
                    value={formCargo}
                    onChange={e => setFormCargo(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                    Matrícula Funcional
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 09482"
                    value={formMatricula}
                    onChange={e => setFormMatricula(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                    Secretaria / Órgão
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Secretaria de Finanças"
                    value={formSecretaria}
                    onChange={e => setFormSecretaria(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                    Valor da Verba (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-neutral-400 font-bold text-xs">R$</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={formValor}
                      onChange={e => setFormValor(applyCurrencyMask(e.target.value))}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-black font-['Montserrat'] text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco de Entregas Obrigatórias */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-300 block">
                  Comprovação & Documentação Obrigatória
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Requerimento */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEntregouReq}
                        onChange={e => setFormEntregouReq(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Entregou Requerimento
                      </span>
                    </label>
                    {formEntregouReq && (
                      <input
                        type="date"
                        value={formDataReq}
                        onChange={e => setFormDataReq(e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
                      />
                    )}
                  </div>

                  {/* Relatório */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEntregouRel}
                        onChange={e => setFormEntregouRel(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Entregou Relatório
                      </span>
                    </label>
                    {formEntregouRel && (
                      <input
                        type="date"
                        value={formDataRel}
                        onChange={e => setFormDataRel(e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                  Status de Aprovação
                </label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="regular">Regular (Tudo Conforme)</option>
                  <option value="em_analise">Em Análise / Avaliação</option>
                  <option value="pendente">Pendente de Entrega</option>
                  <option value="irregular">Irregular (Inconsistência Apurada)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                  Observações / Parecer do Controle Interno
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações complementares sobre prazos, documentos apresentados ou diligências..."
                  value={formObservacoes}
                  onChange={e => setFormObservacoes(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl text-xs font-medium text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

