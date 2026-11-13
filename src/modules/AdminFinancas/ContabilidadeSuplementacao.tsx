import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  Search,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  ArrowRightLeft,
  Trash2,
  Download,
  FileText,
  History,
  Calculator,
  X,
  Plus,
  RefreshCw,
  AlertOctagon,
  Printer,
  Filter,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import {
  getFleetBudgetClassifications,
  createFleetBudgetClassification,
  FleetBudgetClassification
} from '../../lib/api/fleetFuel';
import { showToast } from '../../components/ui/Toast';
import { Institution, AdminUser } from '../../types';
import {
  parseFiorilliFichasPdf,
  parseFichasSpreadsheet,
  parsePtBrCurrency,
  ParsedFichaOrcamentaria
} from './utils/fiorilliFichasParser';

export interface ContabilidadeFicha extends ParsedFichaOrcamentaria {
  id: string;
  exercicio: number;
  totalDescontado: number;
  totalSuplementado: number;
  updatedAt: string;
}

export interface ContabilidadeLancamento {
  id: string;
  exercicio: number;
  ficha: string;
  tipo: 'desconto' | 'suplementacao';
  valor: number;
  documento?: string;
  observacao?: string;
  fichaContrapartida?: string;
  createdBy?: string;
  createdAt: string;
}

interface ContabilidadeSuplementacaoProps {
  currentInstitution?: Institution | null;
  currentUser?: AdminUser | null;
}

type SinalStatus = 'negativo' | 'zerado' | 'critico' | 'regular';

function getSaldoFicha(f: ContabilidadeFicha): number {
  return Number((f.dotacaoAtual + f.totalSuplementado - f.totalDescontado).toFixed(2));
}

function getSinalFicha(saldo: number): SinalStatus {
  if (saldo < -0.001) return 'negativo';
  if (Math.abs(saldo) <= 0.001) return 'zerado';
  if (saldo <= 100) return 'critico';
  return 'regular';
}

function normalizeFichaKey(raw: string): string {
  const trimmed = String(raw || '').trim();
  const stripped = trimmed.replace(/^0+/, '');
  return stripped || '0';
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrencyInputPtBr(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatLancamentoDateLabel(l: ContabilidadeLancamento): string {
  const match = l.observacao?.match(/Período:\s*(\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4})/);
  if (match) return match[1];
  return new Date(l.createdAt).toLocaleDateString('pt-BR');
}

export const ContabilidadeSuplementacao: React.FC<ContabilidadeSuplementacaoProps> = ({
  currentInstitution,
  currentUser,
}) => {
  const instId = currentInstitution?.id || currentUser?.institution_id || 'default';
  const [exercicio, setExercicio] = useState<number>(new Date().getFullYear());
  const [fichas, setFichas] = useState<ContabilidadeFicha[]>([]);
  const [lancamentos, setLancamentos] = useState<ContabilidadeLancamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orgaoFilter, setOrgaoFilter] = useState<string>('todos');
  const [sinalFilter, setSinalFilter] = useState<'todos' | 'negativo' | 'critico_zerado' | 'regular' | 'movimentadas'>('todos');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [dataInicioFilter, setDataInicioFilter] = useState<string>('');
  const [dataFimFilter, setDataFimFilter] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Formulário de Lançamento Rápido
  const [operacao, setOperacao] = useState<'desconto' | 'suplementacao' | 'transferencia'>('desconto');
  const [fichaInput, setFichaInput] = useState<string>('');
  const [fichaDestinoInput, setFichaDestinoInput] = useState<string>('');
  const [valorInput, setValorInput] = useState<string>('');
  const [documentoInput, setDocumentoInput] = useState<string>('');
  const [dataLancamentoInput, setDataLancamentoInput] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dataLancamentoFimInput, setDataLancamentoFimInput] = useState<string>('');

  // Modal Nova Ficha Manual
  const [showNewFichaModal, setShowNewFichaModal] = useState<boolean>(false);
  const [newFichaForm, setNewFichaForm] = useState({
    ficha: '',
    cloc: '',
    orgao: '',
    acaoDescricao: '',
    categoria: '3.3.90.00.00',
    especificacao: 'APLICAÇÕES DIRETAS',
    fonteRecurso: '1.1.500/110.000 1.500',
    dotacaoAtual: '',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const valorInputRef = useRef<HTMLInputElement | null>(null);

  const storageFichasKey = `fin_contab_fichas_${instId}_${exercicio}`;
  const storageLancKey = `fin_contab_lanc_${instId}_${exercicio}`;
  const [syncingFrotas, setSyncingFrotas] = useState<boolean>(false);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [clearingFichas, setClearingFichas] = useState<boolean>(false);

  const persistLocal = (nextFichas: ContabilidadeFicha[], nextLanc: ContabilidadeLancamento[]) => {
    try {
      localStorage.setItem(storageFichasKey, JSON.stringify(nextFichas));
      localStorage.setItem(storageLancKey, JSON.stringify(nextLanc));
    } catch {
      // ignore quota errors
    }
  };

  // Sincroniza fichas cadastradas nas Frotas para a Contabilidade
  const syncFichasFromFrotas = async (
    baseFichas: ContabilidadeFicha[],
    baseLanc: ContabilidadeLancamento[],
    showFeedback = false
  ): Promise<ContabilidadeFicha[]> => {
    try {
      const frotasList: FleetBudgetClassification[] = await getFleetBudgetClassifications(instId);
      if (!frotasList || frotasList.length === 0) {
        if (showFeedback) showToast('Nenhuma ficha encontrada no módulo de Frotas.', 'info');
        return baseFichas;
      }

      const existingKeys = new Set(baseFichas.map((f) => normalizeFichaKey(f.ficha)));
      const nowIso = new Date().toISOString();
      const added: ContabilidadeFicha[] = [];

      for (const bc of frotasList) {
        const sheet = String(bc.invoice_sheet || '').trim();
        if (!sheet) continue;
        const normKey = normalizeFichaKey(sheet);
        if (existingKeys.has(normKey)) continue;

        existingKeys.add(normKey);
        const formattedFicha = /^\d+$/.test(sheet) && sheet.length < 3 ? sheet.padStart(3, '0') : sheet;
        added.push({
          id: crypto.randomUUID(),
          exercicio,
          ficha: formattedFicha,
          cloc: bc.budget_code || '',
          orgao: bc.department_local ? `FROTAS • ${bc.department_local}` : 'FROTAS',
          unidade: '',
          funcProg: '',
          acaoDescricao: bc.department_local || 'Classificação Orçamentária (Frotas)',
          categoria: '3.3.90.00.00',
          especificacao: 'APLICAÇÕES DIRETAS',
          fonteRecurso: bc.funding_source || '',
          dotacaoInicial: 0,
          alteracaoPdf: 0,
          dotacaoAtual: 0,
          totalDescontado: 0,
          totalSuplementado: 0,
          updatedAt: nowIso,
        });
      }

      if (added.length === 0) {
        if (showFeedback) showToast('Todas as fichas das Frotas já estão sincronizadas aqui.', 'info');
        return baseFichas;
      }

      const merged = [...baseFichas, ...added].sort((a, b) =>
        a.ficha.localeCompare(b.ficha, 'pt-BR', { numeric: true })
      );
      setFichas(merged);
      persistLocal(merged, baseLanc);

      try {
        await supabase.from('fin_contabilidade_fichas').upsert(
          added.map((f) => ({
            institution_id: instId,
            exercicio,
            ficha: f.ficha,
            cloc: f.cloc,
            orgao: f.orgao,
            acao_descricao: f.acaoDescricao,
            categoria: f.categoria,
            especificacao: f.especificacao,
            fonte_recurso: f.fonteRecurso,
            dotacao_inicial: 0,
            alteracao_pdf: 0,
            dotacao_atual: 0,
            total_descontado: 0,
            total_suplementado: 0,
            updated_by: currentUser?.name || 'Sincronização Frotas',
            updated_at: nowIso,
          })),
          { onConflict: 'institution_id,exercicio,ficha' }
        );
      } catch {
        // ignore
      }

      if (showFeedback) {
        showToast(`${added.length} ficha(s) importada(s) das Frotas!`, 'success');
      }
      return merged;
    } catch {
      if (showFeedback) showToast('Erro ao buscar fichas das Frotas.', 'error');
      return baseFichas;
    }
  };

  // Carrega dados do Supabase com fallback para localStorage + puxa fichas das Frotas
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      let loadedFichas: ContabilidadeFicha[] = [];
      let loadedLanc: ContabilidadeLancamento[] = [];
      let loadedFromRemote = false;

      try {
        const [fichasRes, lancRes] = await Promise.all([
          supabase
            .from('fin_contabilidade_fichas')
            .select('*')
            .eq('institution_id', instId)
            .eq('exercicio', exercicio)
            .order('ficha', { ascending: true }),
          supabase
            .from('fin_contabilidade_lancamentos')
            .select('*')
            .eq('institution_id', instId)
            .eq('exercicio', exercicio)
            .order('created_at', { ascending: false })
            .limit(300),
        ]);

        if (!cancelled && !fichasRes.error && fichasRes.data && fichasRes.data.length > 0) {
          loadedFromRemote = true;
          loadedFichas = fichasRes.data.map((row: any) => ({
            id: row.id,
            exercicio: row.exercicio,
            ficha: String(row.ficha),
            cloc: row.cloc || '',
            orgao: row.orgao || '',
            unidade: row.unidade || '',
            funcProg: row.func_prog || '',
            acaoDescricao: row.acao_descricao || '',
            categoria: row.categoria || '',
            especificacao: row.especificacao || '',
            fonteRecurso: row.fonte_recurso || '',
            dotacaoInicial: Number(row.dotacao_inicial) || 0,
            alteracaoPdf: Number(row.alteracao_pdf) || 0,
            dotacaoAtual: Number(row.dotacao_atual) || 0,
            totalDescontado: Number(row.total_descontado) || 0,
            totalSuplementado: Number(row.total_suplementado) || 0,
            updatedAt: row.updated_at || new Date().toISOString(),
          }));

          if (!lancRes.error && lancRes.data) {
            loadedLanc = lancRes.data.map((l: any) => ({
              id: l.id,
              exercicio: l.exercicio,
              ficha: String(l.ficha),
              tipo: l.tipo,
              valor: Number(l.valor) || 0,
              documento: l.documento || '',
              observacao: l.observacao || '',
              fichaContrapartida: l.ficha_contrapartida || undefined,
              createdBy: l.created_by || undefined,
              createdAt: l.created_at,
            }));
          }
        }
      } catch {
        // Fallback para localStorage abaixo
      }

      if (!loadedFromRemote) {
        try {
          const rawF = localStorage.getItem(storageFichasKey);
          const rawL = localStorage.getItem(storageLancKey);
          loadedFichas = rawF ? JSON.parse(rawF) : [];
          loadedLanc = rawL ? JSON.parse(rawL) : [];
        } catch {
          loadedFichas = [];
          loadedLanc = [];
        }
      }

      if (!cancelled) {
        setFichas(loadedFichas);
        setLancamentos(loadedLanc);
        persistLocal(loadedFichas, loadedLanc);
        await syncFichasFromFrotas(loadedFichas, loadedLanc, false);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [instId, exercicio, storageFichasKey, storageLancKey]);

  // Escuta em tempo real quando uma ficha é cadastrada nas Frotas
  useEffect(() => {
    const handleFrotasUpdated = () => {
      syncFichasFromFrotas(fichas, lancamentos, false);
    };
    window.addEventListener('fleet-budget-classifications-updated', handleFrotasUpdated);
    return () => {
      window.removeEventListener('fleet-budget-classifications-updated', handleFrotasUpdated);
    };
  }, [fichas, lancamentos, instId, exercicio]);

  // Totais Consolidados em Tempo Real
  const totals = useMemo(() => {
    let dotacaoInicial = 0;
    let dotacaoAtualBase = 0;
    let totalDescontado = 0;
    let totalSuplementado = 0;
    let saldoConsolidado = 0;

    const negativas: ContabilidadeFicha[] = [];
    let criticoZeradoCount = 0;
    let regularCount = 0;

    for (const f of fichas) {
      dotacaoInicial += f.dotacaoInicial;
      dotacaoAtualBase += f.dotacaoAtual;
      totalDescontado += f.totalDescontado;
      totalSuplementado += f.totalSuplementado;
      const saldo = getSaldoFicha(f);
      saldoConsolidado += saldo;

      const sinal = getSinalFicha(saldo);
      if (sinal === 'negativo') {
        negativas.push(f);
      } else if (sinal === 'zerado' || sinal === 'critico') {
        criticoZeradoCount++;
      } else {
        regularCount++;
      }
    }

    return {
      dotacaoInicial,
      dotacaoAtualBase,
      totalDescontado,
      totalSuplementado,
      saldoConsolidado,
      negativas,
      criticoZeradoCount,
      regularCount,
    };
  }, [fichas]);

  const orgaosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const f of fichas) {
      if (f.orgao) set.add(f.orgao);
    }
    return Array.from(set).sort();
  }, [fichas]);

  const filteredFichas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return fichas.filter((f) => {
      if (orgaoFilter !== 'todos' && f.orgao !== orgaoFilter) return false;

      const saldo = getSaldoFicha(f);
      const sinal = getSinalFicha(saldo);

      if (sinalFilter === 'negativo' && sinal !== 'negativo') return false;
      if (sinalFilter === 'critico_zerado' && sinal !== 'critico' && sinal !== 'zerado') return false;
      if (sinalFilter === 'regular' && sinal !== 'regular') return false;
      if (sinalFilter === 'movimentadas' && f.totalDescontado === 0 && f.totalSuplementado === 0) return false;

      if (!q) return true;
      return (
        f.ficha.toLowerCase().includes(q) ||
        f.cloc.toLowerCase().includes(q) ||
        f.orgao.toLowerCase().includes(q) ||
        f.acaoDescricao.toLowerCase().includes(q) ||
        f.especificacao.toLowerCase().includes(q) ||
        f.fonteRecurso.toLowerCase().includes(q) ||
        f.categoria.toLowerCase().includes(q)
      );
    });
  }, [fichas, searchTerm, orgaoFilter, sinalFilter]);

  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((l) => {
      const dateStr = (l.createdAt || '').slice(0, 10);
      if (dataInicioFilter && dateStr < dataInicioFilter) return false;
      if (dataFimFilter && dateStr > dataFimFilter) return false;
      return true;
    });
  }, [lancamentos, dataInicioFilter, dataFimFilter]);

  const periodoStats = useMemo(() => {
    let totalDescontado = 0;
    let totalSuplementado = 0;
    const fichasSet = new Set<string>();
    for (const l of filteredLancamentos) {
      fichasSet.add(l.ficha);
      if (l.tipo === 'desconto') totalDescontado += l.valor;
      else totalSuplementado += l.valor;
    }
    return {
      totalDescontado,
      totalSuplementado,
      count: filteredLancamentos.length,
      fichasCount: fichasSet.size,
    };
  }, [filteredLancamentos]);

  const formatPeriodLabel = () => {
    const fmt = (iso: string) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    };
    if (dataInicioFilter && dataFimFilter) return `${fmt(dataInicioFilter)} a ${fmt(dataFimFilter)}`;
    if (dataInicioFilter) return `A partir de ${fmt(dataInicioFilter)}`;
    if (dataFimFilter) return `Até ${fmt(dataFimFilter)}`;
    return 'Todo o exercício';
  };

  // Exportar Relatório do Período para Excel
  const handleExportPeriodoExcel = () => {
    if (filteredLancamentos.length === 0) {
      showToast('Não há lançamentos no intervalo selecionado para exportar.', 'warning');
      return;
    }
    const fichaByNum = new Map<string, ContabilidadeFicha>(fichas.map((f) => [f.ficha, f]));
    const rows: Record<string, unknown>[] = filteredLancamentos.map((l) => {
      const fObj = fichaByNum.get(l.ficha);
      return {
        Data: formatLancamentoDateLabel(l),
        Operacao: l.tipo === 'desconto' ? 'Desconto (-)' : 'Suplementação (+)',
        Ficha: l.ficha,
        Orgao: fObj?.orgao || '',
        Acao: fObj?.acaoDescricao || '',
        Decreto: l.documento || '',
        Valor: l.tipo === 'desconto' ? -l.valor : l.valor,
        'Saldo Atual da Ficha': fObj ? getSaldoFicha(fObj) : 0,
      };
    });
    rows.push({
      Data: 'TOTAL DO PERÍODO',
      Operacao: `${periodoStats.count} lançamento(s)`,
      Ficha: `${periodoStats.fichasCount} ficha(s)`,
      Orgao: `Descontado: ${formatBRL(periodoStats.totalDescontado)}`,
      Acao: `Suplementado: ${formatBRL(periodoStats.totalSuplementado)}`,
      Decreto: '',
      Valor: periodoStats.totalSuplementado - periodoStats.totalDescontado,
      'Saldo Atual da Ficha': '',
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 18 },
      { wch: 10 },
      { wch: 32 },
      { wch: 36 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio_Periodo');
    XLSX.writeFile(wb, `Relatorio_Suplementacao_${exercicio}_${dataInicioFilter || 'inicio'}_${dataFimFilter || 'fim'}.xlsx`);
    showToast('Relatório do período exportado em Excel!', 'success');
  };

  // Imprimir / Salvar PDF do Relatório do Período
  const handlePrintPeriodoReport = () => {
    const fichaByNum = new Map<string, ContabilidadeFicha>(fichas.map((f) => [f.ficha, f]));
    const win = window.open('', '_blank', 'width=1100,height=780');
    if (!win) {
      showToast('Permita pop-ups para imprimir o relatório.', 'warning');
      return;
    }
    const instName = currentInstitution?.name || 'CONTABILIDADE MUNICIPAL';
    const rowsHtml = filteredLancamentos
      .map((l, idx) => {
        const fObj = fichaByNum.get(l.ficha);
        const saldoAtual = fObj ? getSaldoFicha(fObj) : null;
        const isNeg = saldoAtual !== null && saldoAtual < -0.001;
        return `
          <tr style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}">
            <td class="nowrap">${formatLancamentoDateLabel(l)}</td>
            <td class="nowrap">
              <span class="badge ${l.tipo === 'desconto' ? 'badge-desc' : 'badge-supl'}">
                ${l.tipo === 'desconto' ? 'DESCONTO (-)' : 'SUPLEMENTAÇÃO (+)'}
              </span>
            </td>
            <td class="nowrap strong center">${l.ficha}</td>
            <td>
              <div class="strong">${fObj?.orgao || '—'}</div>
              ${fObj?.acaoDescricao ? `<div class="muted">${fObj.acaoDescricao}</div>` : ''}
            </td>
            <td class="nowrap">${l.documento || '—'}</td>
            <td class="nowrap num strong" style="color:${l.tipo === 'desconto' ? '#be123c' : '#047857'}">
              ${l.tipo === 'desconto' ? '-' : '+'} ${formatBRL(l.valor)}
            </td>
            <td class="nowrap num strong" style="color:${isNeg ? '#dc2626' : '#0f172a'}">
              ${saldoAtual !== null ? formatBRL(saldoAtual) : '—'}
            </td>
          </tr>
        `;
      })
      .join('');

    const saldoLiquido = periodoStats.totalSuplementado - periodoStats.totalDescontado;

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório de Suplementação de Fichas (${formatPeriodLabel()})</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 16px; color: #0f172a; font-size: 11px; line-height: 1.35; }
          .header { border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
          .inst { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.04em; }
          h1 { font-size: 17px; font-weight: 800; margin: 2px 0 4px 0; color: #0f172a; }
          .meta { font-size: 11px; color: #334155; }
          .meta-right { text-align: right; font-size: 10px; color: #64748b; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
          .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; background: #f8fafc; }
          .card .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em; }
          .card .val { font-size: 14px; font-weight: 800; margin-top: 3px; font-variant-numeric: tabular-nums; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: middle; }
          th { background: #1e293b; color: #ffffff; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
          tfoot td { background: #f1f5f9; font-weight: 800; border-top: 2px solid #334155; }
          .nowrap { white-space: nowrap; }
          .strong { font-weight: 700; }
          .center { text-align: center; }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .muted { font-size: 9.5px; color: #64748b; margin-top: 1px; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; }
          .badge-desc { background: #ffe4e6; color: #be123c; }
          .badge-supl { background: #d1fae5; color: #047857; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 36px; padding: 0 24px; page-break-inside: avoid; }
          .sig-line { border-top: 1px solid #334155; padding-top: 6px; text-align: center; font-size: 10px; color: #334155; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="inst">${instName}</div>
            <h1>Relatório de Suplementação e Descontos de Fichas</h1>
            <div class="meta">Exercício: <strong>${exercicio}</strong> &bull; Período: <strong>${formatPeriodLabel()}</strong></div>
          </div>
          <div class="meta-right">
            Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}<br/>
            Responsável: ${currentUser?.name || 'Contabilidade'}
          </div>
        </div>

        <div class="cards">
          <div class="card"><div class="lbl">Lançamentos no Período</div><div class="val">${periodoStats.count}</div></div>
          <div class="card"><div class="lbl">Fichas Movimentadas</div><div class="val">${periodoStats.fichasCount}</div></div>
          <div class="card"><div class="lbl">Total Descontado (-)</div><div class="val" style="color:#be123c">- ${formatBRL(periodoStats.totalDescontado)}</div></div>
          <div class="card"><div class="lbl">Total Suplementado (+)</div><div class="val" style="color:#047857">+ ${formatBRL(periodoStats.totalSuplementado)}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:76px">Data</th>
              <th style="width:120px">Operação</th>
              <th style="width:62px;text-align:center">Ficha</th>
              <th>Órgão / Ação</th>
              <th style="width:120px">Nº Decreto</th>
              <th style="width:125px;text-align:right">Valor</th>
              <th style="width:130px;text-align:right">Saldo Atual Ficha</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center;padding:18px;color:#64748b">Nenhum lançamento encontrado no período selecionado.</td></tr>'}
          </tbody>
          ${filteredLancamentos.length > 0 ? `
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right">RESUMO LÍQUIDO DO PERÍODO (SUPLEMENTAÇÕES - DESCONTOS):</td>
              <td class="num" style="color:${saldoLiquido < 0 ? '#be123c' : '#047857'}">${saldoLiquido < 0 ? '-' : '+'} ${formatBRL(Math.abs(saldoLiquido))}</td>
              <td class="num">—</td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        <div class="signatures">
          <div class="sig-line">Contabilidade / Responsável Técnico</div>
          <div class="sig-line">Conferência / Controle Interno</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  // Ficha selecionada no formulário de lançamento rápido
  const selectedFichaObj = useMemo(() => {
    const key = fichaInput.trim();
    if (!key) return null;
    return (
      fichas.find((f) => f.ficha === key) ||
      fichas.find((f) => f.ficha.replace(/^0+/, '') === key.replace(/^0+/, '')) ||
      null
    );
  }, [fichas, fichaInput]);

  const selectedDestinoObj = useMemo(() => {
    const key = fichaDestinoInput.trim();
    if (!key) return null;
    return (
      fichas.find((f) => f.ficha === key) ||
      fichas.find((f) => f.ficha.replace(/^0+/, '') === key.replace(/^0+/, '')) ||
      null
    );
  }, [fichas, fichaDestinoInput]);

  const valorNumericoPreview = useMemo(() => parsePtBrCurrency(valorInput), [valorInput]);

  const saldoPreview = useMemo(() => {
    if (!selectedFichaObj || valorNumericoPreview <= 0) return null;
    const atual = getSaldoFicha(selectedFichaObj);
    const delta = operacao === 'suplementacao' ? valorNumericoPreview : -valorNumericoPreview;
    return Number((atual + delta).toFixed(2));
  }, [selectedFichaObj, valorNumericoPreview, operacao]);

  // Importação de PDF ou Planilha
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const lowerName = file.name.toLowerCase();
      const parsed = lowerName.endsWith('.pdf')
        ? await parseFiorilliFichasPdf(file)
        : await parseFichasSpreadsheet(file);

      if (!parsed.fichas || parsed.fichas.length === 0) {
        showToast('Nenhuma ficha orçamentária foi identificada no arquivo enviado.', 'warning');
        setImporting(false);
        return;
      }

      const targetExercicio = parsed.exercicio || exercicio;
      if (targetExercicio !== exercicio) {
        setExercicio(targetExercicio);
      }

      // Preserva descontos/suplementações manuais já lançados para fichas de mesmo número, se houver
      const existingByFicha = new Map<string, ContabilidadeFicha>(fichas.map((f) => [f.ficha, f]));
      const nowIso = new Date().toISOString();

      const nextFichas: ContabilidadeFicha[] = parsed.fichas.map((item) => {
        const prev = existingByFicha.get(item.ficha);
        return {
          ...item,
          id: prev?.id || crypto.randomUUID(),
          exercicio: targetExercicio,
          totalDescontado: prev?.totalDescontado || 0,
          totalSuplementado: prev?.totalSuplementado || 0,
          updatedAt: nowIso,
        };
      });

      setFichas(nextFichas);
      persistLocal(nextFichas, lancamentos);

      // Persiste em lote no Supabase
      try {
        const payload = nextFichas.map((f) => ({
          institution_id: instId,
          exercicio: targetExercicio,
          ficha: f.ficha,
          cloc: f.cloc,
          orgao: f.orgao,
          unidade: f.unidade,
          func_prog: f.funcProg,
          acao_descricao: f.acaoDescricao,
          categoria: f.categoria,
          especificacao: f.especificacao,
          fonte_recurso: f.fonteRecurso,
          dotacao_inicial: f.dotacaoInicial,
          alteracao_pdf: f.alteracaoPdf,
          dotacao_atual: f.dotacaoAtual,
          total_descontado: f.totalDescontado,
          total_suplementado: f.totalSuplementado,
          updated_by: currentUser?.name || 'Contabilidade',
          updated_at: nowIso,
        }));

        await supabase
          .from('fin_contabilidade_fichas')
          .upsert(payload, { onConflict: 'institution_id,exercicio,ficha' });
      } catch {
        // Mantém salvo localmente se Supabase não estiver acessível
      }

      showToast(
        `${nextFichas.length} fichas carregadas (${parsed.municipio} • Exercício ${targetExercicio})!`,
        'success'
      );
    } catch (err) {
      console.error('Erro ao ler arquivo de fichas:', err);
      showToast('Erro ao processar o arquivo. Verifique se é um PDF Fiorilli ou planilha válida.', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Lançamento manual (Desconto / Suplementação / Transferência) com subtração em tempo real
  const handleConfirmLancamento = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedFichaObj) {
      showToast('Selecione ou digite um número de Ficha válido.', 'warning');
      return;
    }

    const valor = parsePtBrCurrency(valorInput);
    if (valor <= 0) {
      showToast('Informe um valor maior que zero para o lançamento.', 'warning');
      return;
    }

    if (operacao === 'transferencia' && !selectedDestinoObj) {
      showToast('Informe a Ficha de Destino para a suplementação.', 'warning');
      return;
    }

    if (operacao === 'transferencia' && selectedDestinoObj?.ficha === selectedFichaObj.ficha) {
      showToast('A ficha de origem e destino devem ser diferentes.', 'warning');
      return;
    }

    if (dataLancamentoFimInput && dataLancamentoInput && dataLancamentoFimInput < dataLancamentoInput) {
      showToast('A data final da suplementação não pode ser anterior à data inicial.', 'warning');
      return;
    }

    const fmtIsoToBr = (isoDate: string) => {
      const [y, m, d] = isoDate.split('-');
      return `${d}/${m}/${y}`;
    };
    const periodoObs =
      dataLancamentoFimInput && dataLancamentoInput && dataLancamentoFimInput !== dataLancamentoInput
        ? `Período: ${fmtIsoToBr(dataLancamentoInput)} a ${fmtIsoToBr(dataLancamentoFimInput)}`
        : undefined;

    const nowIso = new Date().toISOString();
    const lancDateIso = dataLancamentoInput
      ? `${dataLancamentoInput}T12:00:00.000Z`
      : nowIso;
    const userLabel = currentUser?.name || 'Contabilidade';
    const newLancs: ContabilidadeLancamento[] = [];
    const updatedFichasMap = new Map<string, ContabilidadeFicha>();

    if (operacao === 'desconto' || operacao === 'transferencia') {
      const updatedOrigem: ContabilidadeFicha = {
        ...selectedFichaObj,
        totalDescontado: Number((selectedFichaObj.totalDescontado + valor).toFixed(2)),
        updatedAt: nowIso,
      };
      updatedFichasMap.set(updatedOrigem.ficha, updatedOrigem);
      const baseObs = operacao === 'transferencia' ? `Anulação p/ suplementar Ficha ${selectedDestinoObj?.ficha}` : undefined;
      newLancs.push({
        id: crypto.randomUUID(),
        exercicio,
        ficha: selectedFichaObj.ficha,
        tipo: 'desconto',
        valor,
        documento: documentoInput.trim() || undefined,
        observacao: [baseObs, periodoObs].filter(Boolean).join(' • ') || undefined,
        fichaContrapartida: operacao === 'transferencia' ? selectedDestinoObj?.ficha : undefined,
        createdBy: userLabel,
        createdAt: lancDateIso,
      });
    }

    if (operacao === 'suplementacao') {
      const updatedSupl: ContabilidadeFicha = {
        ...selectedFichaObj,
        totalSuplementado: Number((selectedFichaObj.totalSuplementado + valor).toFixed(2)),
        updatedAt: nowIso,
      };
      updatedFichasMap.set(updatedSupl.ficha, updatedSupl);
      newLancs.push({
        id: crypto.randomUUID(),
        exercicio,
        ficha: selectedFichaObj.ficha,
        tipo: 'suplementacao',
        valor,
        documento: documentoInput.trim() || undefined,
        observacao: periodoObs,
        createdBy: userLabel,
        createdAt: lancDateIso,
      });
    }

    if (operacao === 'transferencia' && selectedDestinoObj) {
      const updatedDestino: ContabilidadeFicha = {
        ...selectedDestinoObj,
        totalSuplementado: Number((selectedDestinoObj.totalSuplementado + valor).toFixed(2)),
        updatedAt: nowIso,
      };
      updatedFichasMap.set(updatedDestino.ficha, updatedDestino);
      const destBaseObs = `Suplementação vinda da Ficha ${selectedFichaObj.ficha}`;
      newLancs.push({
        id: crypto.randomUUID(),
        exercicio,
        ficha: selectedDestinoObj.ficha,
        tipo: 'suplementacao',
        valor,
        documento: documentoInput.trim() || undefined,
        observacao: [destBaseObs, periodoObs].filter(Boolean).join(' • '),
        fichaContrapartida: selectedFichaObj.ficha,
        createdBy: userLabel,
        createdAt: lancDateIso,
      });
    }

    const nextFichas = fichas.map((f) => updatedFichasMap.get(f.ficha) || f);
    const nextLancamentos = [...newLancs, ...lancamentos];

    // Atualiza imediatamente na UI (tempo real)
    setFichas(nextFichas);
    setLancamentos(nextLancamentos);
    persistLocal(nextFichas, nextLancamentos);

    // Verifica se a ficha ficou com saldo negativo após o desconto
    const origemAfter = updatedFichasMap.get(selectedFichaObj.ficha);
    if (origemAfter) {
      const novoSaldo = getSaldoFicha(origemAfter);
      if (novoSaldo < -0.001) {
        showToast(
          `ATENÇÃO: Ficha ${origemAfter.ficha} ficou com SALDO NEGATIVO (${formatBRL(novoSaldo)})!`,
          'error'
        );
      } else {
        showToast(
          operacao === 'transferencia'
            ? `Transferência de ${formatBRL(valor)} concluída (Ficha ${selectedFichaObj.ficha} → ${selectedDestinoObj?.ficha})!`
            : `${operacao === 'desconto' ? 'Desconto' : 'Suplementação'} de ${formatBRL(valor)} lançado na Ficha ${selectedFichaObj.ficha}!`,
          'success'
        );
      }
    }

    // Mantém ficha selecionada, decreto e data; limpa apenas o valor para agilizar lançamentos sequenciais
    setValorInput('');
    setTimeout(() => {
      valorInputRef.current?.focus();
    }, 30);

    // Persiste no Supabase em background
    try {
      for (const f of updatedFichasMap.values()) {
        await supabase
          .from('fin_contabilidade_fichas')
          .update({
            total_descontado: f.totalDescontado,
            total_suplementado: f.totalSuplementado,
            updated_by: userLabel,
            updated_at: nowIso,
          })
          .eq('institution_id', instId)
          .eq('exercicio', exercicio)
          .eq('ficha', f.ficha);
      }

      await supabase.from('fin_contabilidade_lancamentos').insert(
        newLancs.map((l) => ({
          id: l.id,
          institution_id: instId,
          exercicio: l.exercicio,
          ficha: l.ficha,
          tipo: l.tipo,
          valor: l.valor,
          documento: l.documento || null,
          observacao: l.observacao || null,
          ficha_contrapartida: l.fichaContrapartida || null,
          created_by: l.createdBy || null,
          created_at: l.createdAt,
        }))
      );
    } catch {
      // Fallback já salvo no localStorage
    }
  };

  // Estornar lançamento
  const handleEstornarLancamento = async (lanc: ContabilidadeLancamento) => {
    const target = fichas.find((f) => f.ficha === lanc.ficha);
    const nowIso = new Date().toISOString();

    let nextFichas = fichas;
    if (target) {
      const updated: ContabilidadeFicha = {
        ...target,
        totalDescontado:
          lanc.tipo === 'desconto'
            ? Math.max(0, Number((target.totalDescontado - lanc.valor).toFixed(2)))
            : target.totalDescontado,
        totalSuplementado:
          lanc.tipo === 'suplementacao'
            ? Math.max(0, Number((target.totalSuplementado - lanc.valor).toFixed(2)))
            : target.totalSuplementado,
        updatedAt: nowIso,
      };
      nextFichas = fichas.map((f) => (f.ficha === target.ficha ? updated : f));

      try {
        await supabase
          .from('fin_contabilidade_fichas')
          .update({
            total_descontado: updated.totalDescontado,
            total_suplementado: updated.totalSuplementado,
            updated_at: nowIso,
          })
          .eq('institution_id', instId)
          .eq('exercicio', exercicio)
          .eq('ficha', target.ficha);
      } catch {
        // ignore
      }
    }

    const nextLanc = lancamentos.filter((l) => l.id !== lanc.id);
    setFichas(nextFichas);
    setLancamentos(nextLanc);
    persistLocal(nextFichas, nextLanc);

    try {
      await supabase.from('fin_contabilidade_lancamentos').delete().eq('id', lanc.id);
    } catch {
      // ignore
    }

    showToast(`Lançamento na Ficha ${lanc.ficha} estornado e saldo recalculado.`, 'info');
  };

  // Zerar todas as fichas e lançamentos do exercício atual
  const handleZerarFichas = async () => {
    setClearingFichas(true);
    try {
      await supabase
        .from('fin_contabilidade_lancamentos')
        .delete()
        .eq('institution_id', instId)
        .eq('exercicio', exercicio);
      await supabase
        .from('fin_contabilidade_fichas')
        .delete()
        .eq('institution_id', instId)
        .eq('exercicio', exercicio);
    } catch {
      // Continua limpeza local caso Supabase não esteja acessível
    }

    setFichas([]);
    setLancamentos([]);
    setFichaInput('');
    setFichaDestinoInput('');
    setValorInput('');
    setDocumentoInput('');
    persistLocal([], []);
    setClearingFichas(false);
    setShowClearModal(false);
    showToast(`Todas as fichas e lançamentos do Exercício ${exercicio} foram zerados.`, 'info');
  };

  // Seleção rápida clicando em uma linha da tabela
  const handleSelectFichaFromRow = (fichaNum: string, op: 'desconto' | 'suplementacao') => {
    setOperacao(op);
    setFichaInput(fichaNum);
    setTimeout(() => {
      valorInputRef.current?.focus();
    }, 50);
  };

  // Adicionar ficha manualmente
  const handleAddManualFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = newFichaForm.ficha.trim();
    if (!num) {
      showToast('Informe o número da ficha.', 'warning');
      return;
    }
    if (fichas.some((f) => f.ficha === num)) {
      showToast(`A Ficha ${num} já existe neste exercício.`, 'warning');
      return;
    }

    const dotAtual = parsePtBrCurrency(newFichaForm.dotacaoAtual);
    const nowIso = new Date().toISOString();
    const nova: ContabilidadeFicha = {
      id: crypto.randomUUID(),
      exercicio,
      ficha: num,
      cloc: newFichaForm.cloc.trim(),
      orgao: newFichaForm.orgao.trim() || 'CADASTRO MANUAL',
      unidade: '',
      funcProg: '',
      acaoDescricao: newFichaForm.acaoDescricao.trim(),
      categoria: newFichaForm.categoria.trim(),
      especificacao: newFichaForm.especificacao.trim() || 'APLICAÇÕES DIRETAS',
      fonteRecurso: newFichaForm.fonteRecurso.trim(),
      dotacaoInicial: dotAtual,
      alteracaoPdf: 0,
      dotacaoAtual: dotAtual,
      totalDescontado: 0,
      totalSuplementado: 0,
      updatedAt: nowIso,
    };

    const nextFichas = [...fichas, nova].sort((a, b) => a.ficha.localeCompare(b.ficha, 'pt-BR', { numeric: true }));
    setFichas(nextFichas);
    persistLocal(nextFichas, lancamentos);
    setShowNewFichaModal(false);
    setNewFichaForm({
      ficha: '',
      cloc: '',
      orgao: '',
      acaoDescricao: '',
      categoria: '3.3.90.00.00',
      especificacao: 'APLICAÇÕES DIRETAS',
      fonteRecurso: '1.1.500/110.000 1.500',
      dotacaoAtual: '',
    });

    try {
      await supabase.from('fin_contabilidade_fichas').upsert(
        {
          institution_id: instId,
          exercicio,
          ficha: nova.ficha,
          cloc: nova.cloc,
          orgao: nova.orgao,
          acao_descricao: nova.acaoDescricao,
          categoria: nova.categoria,
          especificacao: nova.especificacao,
          fonte_recurso: nova.fonteRecurso,
          dotacao_inicial: nova.dotacaoInicial,
          alteracao_pdf: 0,
          dotacao_atual: nova.dotacaoAtual,
          total_descontado: 0,
          total_suplementado: 0,
          updated_by: currentUser?.name || 'Contabilidade',
          updated_at: nowIso,
        },
        { onConflict: 'institution_id,exercicio,ficha' }
      );
    } catch {
      // ignore
    }

    // Replica automaticamente a nova ficha para o módulo de Frotas se ainda não existir lá
    try {
      const frotasList = await getFleetBudgetClassifications(instId);
      const existsInFrotas = frotasList.some(
        (b) => normalizeFichaKey(b.invoice_sheet) === normalizeFichaKey(nova.ficha)
      );
      if (!existsInFrotas) {
        await createFleetBudgetClassification(
          {
            institution_id: instId,
            department_local: nova.acaoDescricao || nova.orgao || `Ficha ${nova.ficha}`,
            invoice_sheet: nova.ficha,
            funding_source: nova.fonteRecurso || '1.1.500.0',
            budget_code: nova.cloc || '',
            is_active: true,
          },
          instId
        );
      }
    } catch {
      // ignore
    }

    showToast(`Ficha ${nova.ficha} adicionada e sincronizada com Frotas!`, 'success');
  };

  // Exportar Excel atualizado
  const handleExportExcel = () => {
    if (fichas.length === 0) {
      showToast('Não há fichas carregadas para exportar.', 'warning');
      return;
    }

    const rows = fichas.map((f) => {
      const saldo = getSaldoFicha(f);
      const sinal = getSinalFicha(saldo);
      return {
        Ficha: f.ficha,
        CLoc: f.cloc,
        Orgao: f.orgao,
        Acao: f.acaoDescricao,
        Natureza: f.categoria,
        Especificacao: f.especificacao,
        Fonte: f.fonteRecurso,
        'Dotacao Inicial': f.dotacaoInicial,
        'Dotacao Atual (PDF)': f.dotacaoAtual,
        'Descontos (-)': f.totalDescontado,
        'Suplementacoes (+)': f.totalSuplementado,
        'Saldo Atual': saldo,
        Sinal: sinal === 'negativo' ? 'SALDO NEGATIVO' : sinal === 'zerado' ? 'ZERADO' : sinal === 'critico' ? 'CRÍTICO' : 'REGULAR',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Fichas_${exercicio}`);
    XLSX.writeFile(wb, `Contabilidade_Suplementacao_Fichas_${exercicio}.xlsx`);
    showToast('Planilha exportada com sucesso!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR: IMPORTAÇÃO E AÇÕES */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 p-5 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
              <Calculator size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Contabilidade — Suplementação de Fichas
                </h3>
                <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Importe o PDF de Fichas da Despesa (Fiorilli) ou planilha, lance os valores a descontar/suplementar e acompanhe o saldo e o sinal de alerta negativo instantaneamente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={exercicio}
              onChange={(e) => setExercicio(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-bold text-slate-700 dark:text-neutral-200"
              aria-label="Exercício"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  Exercício {yr}
                </option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-60"
            >
              {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
              <span>{importing ? 'Lendo arquivo...' : 'Importar PDF / Planilha'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setSyncingFrotas(true);
                await syncFichasFromFrotas(fichas, lancamentos, true);
                setSyncingFrotas(false);
              }}
              disabled={syncingFrotas}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors disabled:opacity-60"
              title="Importar fichas cadastradas no módulo de Frotas"
            >
              <RefreshCw size={15} className={syncingFrotas ? 'animate-spin' : ''} />
              <span>Puxar Frotas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewFichaModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold transition-colors"
            >
              <Plus size={15} />
              <span>Nova Ficha</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold transition-colors"
            >
              <Download size={15} />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold transition-colors"
              title="Imprimir"
            >
              <Printer size={15} />
            </button>

            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              disabled={fichas.length === 0 && lancamentos.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Zerar todas as fichas e lançamentos do exercício atual"
            >
              <Trash2 size={15} />
              <span>Zerar Fichas</span>
            </button>
          </div>
        </div>
      </div>

      {/* SISTEMA DE SINAL — ALERTA DE FICHAS COM SALDO NEGATIVO */}
      {totals.negativas.length > 0 && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 p-4 shadow-md animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 animate-pulse shadow-sm">
                <AlertOctagon size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-red-800 dark:text-red-300 uppercase tracking-wide">
                  SINAL VERMELHO: {totals.negativas.length}{' '}
                  {totals.negativas.length === 1 ? 'Ficha com Saldo Negativo' : 'Fichas com Saldo Negativo'}
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300/90 mt-0.5">
                  Os descontos lançados excederam a dotação disponível. Clique em uma ficha abaixo para visualizar ou suplementar:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {totals.negativas.map((nf) => (
                    <button
                      key={nf.ficha}
                      type="button"
                      onClick={() => {
                        setSinalFilter('negativo');
                        setSearchTerm(nf.ficha);
                        handleSelectFichaFromRow(nf.ficha, 'suplementacao');
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>Ficha {nf.ficha}: {formatBRL(getSaldoFicha(nf))}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSinalFilter(sinalFilter === 'negativo' ? 'todos' : 'negativo')}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-red-900/60 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 text-xs font-black uppercase tracking-wider shrink-0 hover:bg-red-100 transition-colors"
            >
              {sinalFilter === 'negativo' ? 'Mostrar Todas' : 'Filtrar Negativas'}
            </button>
          </div>
        </div>
      )}

      {/* KPIs EM TEMPO REAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Dotação Atual (Base PDF)
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-white mt-1">
            {formatBRL(totals.dotacaoAtualBase)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {fichas.length} fichas carregadas
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
            Total Descontado (-)
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            - {formatBRL(totals.totalDescontado)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Subtraído em tempo real
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            Total Suplementado (+)
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            + {formatBRL(totals.totalSuplementado)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Créditos adicionados
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-800 p-4 shadow-md text-white">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
            Total Geral Disponível
          </div>
          <div className={`text-xl font-black mt-1 ${totals.saldoConsolidado < 0 ? 'text-red-400' : 'text-white'}`}>
            {formatBRL(totals.saldoConsolidado)}
          </div>
          <div className="text-[11px] text-indigo-200/80 mt-1">
            {valorNumericoPreview > 0 && selectedFichaObj && operacao === 'desconto'
              ? `Após desconto: ${formatBRL(totals.saldoConsolidado - valorNumericoPreview)}`
              : 'Atualizado em tempo real'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Semáforo das Fichas
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              {totals.negativas.length}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {totals.criticoZeradoCount}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {totals.regularCount}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            Negativas / Críticas / Regulares
          </div>
        </div>
      </div>

      {/* BARRA DE LANÇAMENTO MANUAL EM TEMPO REAL */}
      <form
        onSubmit={handleConfirmLancamento}
        className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 p-5 shadow-sm print:hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-neutral-200">
              Lançamento Manual de Valores
            </span>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-neutral-800 p-1">
            <button
              type="button"
              onClick={() => setOperacao('desconto')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                operacao === 'desconto'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900'
              }`}
            >
              <MinusCircle size={14} />
              <span>Descontar (-)</span>
            </button>
            <button
              type="button"
              onClick={() => setOperacao('suplementacao')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                operacao === 'suplementacao'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900'
              }`}
            >
              <PlusCircle size={14} />
              <span>Suplementar (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setOperacao('transferencia')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                operacao === 'transferencia'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft size={14} />
              <span>Transferir</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              {operacao === 'transferencia' ? 'Ficha Origem (-)' : 'Nº da Ficha'}
            </label>
            <input
              type="text"
              list="contab-fichas-list"
              value={fichaInput}
              onChange={(e) => setFichaInput(e.target.value)}
              placeholder="Ex: 008, 417..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="contab-fichas-list">
              {fichas.map((f) => (
                <option key={f.ficha} value={f.ficha}>
                  {`${f.ficha} | ${f.orgao} | ${f.acaoDescricao} | Saldo: ${formatBRL(getSaldoFicha(f))}`}
                </option>
              ))}
            </datalist>
          </div>

          {operacao === 'transferencia' && (
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Ficha Destino (+)
              </label>
              <input
                type="text"
                list="contab-fichas-list"
                value={fichaDestinoInput}
                onChange={(e) => setFichaDestinoInput(e.target.value)}
                placeholder="Ex: 019..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Valor (R$)
            </label>
            <input
              ref={valorInputRef}
              type="text"
              inputMode="numeric"
              value={valorInput}
              onChange={(e) => setValorInput(formatCurrencyInputPtBr(e.target.value))}
              placeholder="0,00"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className={operacao === 'transferencia' ? 'md:col-span-1' : 'md:col-span-2'}>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Nº do Decreto
            </label>
            <input
              type="text"
              value={documentoInput}
              onChange={(e) => setDocumentoInput(e.target.value)}
              placeholder="Ex: Dec. 012/2026"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className={operacao === 'transferencia' ? 'md:col-span-3' : 'md:col-span-4'}>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Período da Suplementação (De / Até)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={dataLancamentoInput}
                onChange={(e) => setDataLancamentoInput(e.target.value)}
                title="Data inicial"
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="date"
                value={dataLancamentoFimInput}
                min={dataLancamentoInput || undefined}
                onChange={(e) => setDataLancamentoFimInput(e.target.value)}
                title="Data final (opcional)"
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!selectedFichaObj || valorNumericoPreview <= 0}
              className={`w-full py-2.5 px-4 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-40 ${
                operacao === 'desconto'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : operacao === 'suplementacao'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {operacao === 'desconto'
                ? 'Descontar'
                : operacao === 'suplementacao'
                ? 'Suplementar'
                : 'Transferir'}
            </button>
          </div>
        </div>

        {/* Pré-visualização em Tempo Real da Ficha selecionada */}
        {selectedFichaObj && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-neutral-300">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 font-black text-slate-800 dark:text-white">
                Ficha {selectedFichaObj.ficha}
              </span>
              <span className="font-semibold">{selectedFichaObj.orgao || 'Sem órgão'}</span>
              {selectedFichaObj.acaoDescricao && (
                <span className="text-slate-400">• {selectedFichaObj.acaoDescricao}</span>
              )}
              {selectedFichaObj.fonteRecurso && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  • Fonte {selectedFichaObj.fonteRecurso}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 font-bold">
              <span className="text-slate-500">
                Saldo Atual:{' '}
                <strong className={getSaldoFicha(selectedFichaObj) < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'}>
                  {formatBRL(getSaldoFicha(selectedFichaObj))}
                </strong>
              </span>

              {saldoPreview !== null && (
                <span
                  className={`px-2.5 py-0.5 rounded-lg ${
                    saldoPreview < 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 animate-pulse'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}
                >
                  Saldo após lançamento: {formatBRL(saldoPreview)}
                  {saldoPreview < 0 ? ' (SINAL NEGATIVO!)' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </form>

      {/* FILTROS E ALTERNÂNCIA TABELA / HISTÓRICO */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar ficha, CLoc, órgão, ação, fonte..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-medium text-slate-800 dark:text-white"
              />
            </div>

            <select
              value={orgaoFilter}
              onChange={(e) => setOrgaoFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-200 max-w-[240px]"
            >
              <option value="todos">Todos os Órgãos / Secretarias</option>
              {orgaosDisponiveis.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-800 p-1 rounded-xl">
              <Filter size={13} className="text-slate-400 ml-1.5 mr-0.5" />
              {[
                { id: 'todos', label: 'Todas' },
                { id: 'negativo', label: `🔴 Negativas (${totals.negativas.length})` },
                { id: 'critico_zerado', label: `🟡 Críticas (${totals.criticoZeradoCount})` },
                { id: 'movimentadas', label: 'Movimentadas' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSinalFilter(opt.id as typeof sinalFilter)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    sinalFilter === opt.id
                      ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-2.5 py-1">
              <Calendar size={14} className="text-indigo-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500">De</span>
              <input
                type="date"
                value={dataInicioFilter}
                onChange={(e) => setDataInicioFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                title="Data inicial do intervalo"
              />
              <span className="text-[11px] font-bold text-slate-500">Até</span>
              <input
                type="date"
                value={dataFimFilter}
                onChange={(e) => setDataFimFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                title="Data final do intervalo"
              />
              {(dataInicioFilter || dataFimFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInicioFilter('');
                    setDataFimFilter('');
                  }}
                  className="text-slate-400 hover:text-rose-600 ml-0.5"
                  title="Limpar intervalo"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <FileText size={14} />
              <span>Relatório do Período</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                showHistory
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200'
              }`}
            >
              <History size={15} />
              <span>Histórico ({filteredLancamentos.length})</span>
            </button>
          </div>
        </div>

        {/* HISTÓRICO DE LANÇAMENTOS */}
        {showHistory && (
          <div className="p-4 bg-slate-50 dark:bg-neutral-950/50 border-b border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-neutral-300">
                Histórico de Lançamentos ({formatPeriodLabel()}) — {filteredLancamentos.length} registro(s)
              </h4>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            {filteredLancamentos.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">Nenhum lançamento encontrado neste intervalo de datas.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800">
                {filteredLancamentos.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-md font-black uppercase text-[10px] ${
                          l.tipo === 'desconto'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        }`}
                      >
                        {l.tipo === 'desconto' ? 'Desconto (-)' : 'Suplementação (+)'}
                      </span>
                      <span className="font-black text-slate-800 dark:text-white">Ficha {l.ficha}</span>
                      {l.documento && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 font-semibold">
                          {l.documento}
                        </span>
                      )}
                      {l.observacao && <span className="text-slate-500 truncate">{l.observacao}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`font-black ${
                          l.tipo === 'desconto' ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {l.tipo === 'desconto' ? '-' : '+'} {formatBRL(l.valor)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatLancamentoDateLabel(l)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEstornarLancamento(l)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Estornar lançamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TABELA DE FICHAS */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Carregando fichas orçamentárias...</div>
        ) : fichas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto">
              <FileText size={28} />
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-white">
              Nenhuma ficha carregada para {exercicio}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Clique em <strong>Importar PDF / Planilha</strong> acima e envie o relatório{' '}
              <em>Execução Orçamentária - Fichas da Despesa</em> (Fiorilli) para alimentar automaticamente todas as fichas com os valores iniciais.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
            >
              <Upload size={15} />
              <span>Selecionar PDF de Fichas</span>
            </button>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  <th className="py-3 px-2.5 w-[96px]">Sinal</th>
                  <th className="py-3 px-2 w-[66px]">Ficha</th>
                  <th className="py-3 px-2.5">Órgão / Ação / Natureza</th>
                  <th className="py-3 px-2 w-[124px]">Fonte</th>
                  <th className="py-3 px-2 w-[112px] text-right">Saldo PDF</th>
                  <th className="py-3 px-2 w-[104px] text-right">Descontado</th>
                  <th className="py-3 px-2 w-[108px] text-right">Suplementado</th>
                  <th className="py-3 px-2 w-[122px] text-right">Saldo Atual</th>
                  <th className="py-3 px-2 w-[104px] text-center print:hidden">Lançar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
                {filteredFichas.map((f) => {
                  const saldo = getSaldoFicha(f);
                  const sinal = getSinalFicha(saldo);

                  return (
                    <tr
                      key={f.ficha}
                      className={`transition-colors ${
                        sinal === 'negativo'
                          ? 'bg-red-50/90 dark:bg-red-950/30 border-l-4 border-l-red-600 hover:bg-red-100/70'
                          : sinal === 'zerado' || sinal === 'critico'
                          ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50/80 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {sinal === 'negativo' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <AlertTriangle size={10} />
                            NEGATIVO
                          </span>
                        )}
                        {sinal === 'zerado' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] font-bold uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            ZERADO
                          </span>
                        )}
                        {sinal === 'critico' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] font-bold uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            CRÍTICO
                          </span>
                        )}
                        {sinal === 'regular' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold uppercase">
                            <CheckCircle2 size={10} />
                            REGULAR
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="font-black text-sm text-slate-900 dark:text-white">{f.ficha}</div>
                        {f.cloc && <div className="text-[10px] text-slate-400 font-mono truncate">{f.cloc}</div>}
                      </td>

                      <td className="py-2.5 px-2.5 min-w-0">
                        <div
                          className="font-bold text-slate-800 dark:text-neutral-100 truncate"
                          title={f.acaoDescricao || f.especificacao}
                        >
                          {f.acaoDescricao || f.especificacao}
                        </div>
                        <div
                          className="text-[11px] text-slate-500 dark:text-neutral-400 truncate"
                          title={`${f.orgao}${f.categoria ? ` • ${f.categoria}` : ''}${
                            f.especificacao && f.acaoDescricao ? ` • ${f.especificacao}` : ''
                          }`}
                        >
                          {f.orgao}
                          {f.categoria ? ` • ${f.categoria}` : ''}
                          {f.especificacao && f.acaoDescricao ? ` • ${f.especificacao}` : ''}
                        </div>
                      </td>

                      <td
                        className="py-2.5 px-2 font-mono text-[11px] text-slate-600 dark:text-neutral-300 truncate"
                        title={f.fonteRecurso || '—'}
                      >
                        {f.fonteRecurso || '—'}
                      </td>

                      <td className="py-2.5 px-2 whitespace-nowrap text-right font-semibold text-slate-700 dark:text-neutral-300 tabular-nums">
                        {formatBRL(f.dotacaoAtual)}
                      </td>

                      <td className="py-2.5 px-2 whitespace-nowrap text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {f.totalDescontado > 0 ? `- ${formatBRL(f.totalDescontado)}` : '—'}
                      </td>

                      <td className="py-2.5 px-2 whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {f.totalSuplementado > 0 ? `+ ${formatBRL(f.totalSuplementado)}` : '—'}
                      </td>

                      <td
                        className={`py-2.5 px-2 whitespace-nowrap text-right font-black text-[13px] tabular-nums ${
                          sinal === 'negativo'
                            ? 'text-red-600 dark:text-red-400'
                            : sinal === 'zerado' || sinal === 'critico'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {formatBRL(saldo)}
                      </td>

                      <td className="py-2.5 px-2 whitespace-nowrap text-center print:hidden">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelectFichaFromRow(f.ficha, 'desconto')}
                            className="px-1.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-bold text-[10px] transition-colors"
                            title="Descontar desta ficha"
                          >
                            - Desc
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectFichaFromRow(f.ficha, 'suplementacao')}
                            className="px-1.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold text-[10px] transition-colors"
                            title="Suplementar esta ficha"
                          >
                            + Supl
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

      {/* MODAL RELATÓRIO POR INTERVALO DE DATAS */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Relatório de Suplementação por Período
                </h4>
                <p className="text-xs text-slate-500">
                  Período: <strong>{formatPeriodLabel()}</strong> • Exercício {exercicio}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPeriodoExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800"
                >
                  <Download size={14} />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPeriodoReport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  <Printer size={14} />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-neutral-800/60 p-3 rounded-xl border border-slate-200 dark:border-neutral-700">
                <span className="text-xs font-bold text-slate-600 dark:text-neutral-300">Intervalo:</span>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-500">De</label>
                  <input
                    type="date"
                    value={dataInicioFilter}
                    onChange={(e) => setDataInicioFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-500">Até</label>
                  <input
                    type="date"
                    value={dataFimFilter}
                    onChange={(e) => setDataFimFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold"
                  />
                </div>
                {(dataInicioFilter || dataFimFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDataInicioFilter('');
                      setDataFimFilter('');
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline ml-auto"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Lançamentos</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white">{periodoStats.count}</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Fichas Movimentadas</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white">{periodoStats.fichasCount}</div>
                </div>
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
                  <div className="text-[10px] font-bold uppercase text-rose-500">Descontado no Período</div>
                  <div className="text-lg font-black text-rose-600">- {formatBRL(periodoStats.totalDescontado)}</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                  <div className="text-[10px] font-bold uppercase text-emerald-600">Suplementado no Período</div>
                  <div className="text-lg font-black text-emerald-600">+ {formatBRL(periodoStats.totalSuplementado)}</div>
                </div>
              </div>

              {filteredLancamentos.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhum lançamento encontrado para o período selecionado.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                  <table className="w-full table-fixed text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-neutral-800 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 dark:border-neutral-700">
                        <th className="py-2.5 px-2.5 w-[84px]">Data</th>
                        <th className="py-2.5 px-2.5 w-[112px]">Operação</th>
                        <th className="py-2.5 px-2 w-[72px]">Ficha</th>
                        <th className="py-2.5 px-2.5">Órgão / Ação</th>
                        <th className="py-2.5 px-2 w-[90px]">Decreto</th>
                        <th className="py-2.5 px-2.5 w-[112px] text-right">Valor</th>
                        <th className="py-2.5 px-2.5 w-[118px] text-right">Saldo Ficha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                      {filteredLancamentos.map((l) => {
                        const fObj = fichas.find((f) => f.ficha === l.ficha);
                        const saldoAtual = fObj ? getSaldoFicha(fObj) : null;
                        return (
                          <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/40">
                            <td className="py-2 px-3 whitespace-nowrap">{formatLancamentoDateLabel(l)}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                  l.tipo === 'desconto'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                }`}
                              >
                                {l.tipo === 'desconto' ? 'Desconto (-)' : 'Suplementação (+)'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-black whitespace-nowrap">Ficha {l.ficha}</td>
                            <td className="py-2 px-3 max-w-xs">
                              <div className="font-semibold text-slate-800 dark:text-neutral-200 truncate">
                                {fObj?.orgao || '—'}
                              </div>
                              {fObj?.acaoDescricao && (
                                <div className="text-[11px] text-slate-500 truncate">{fObj.acaoDescricao}</div>
                              )}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">{l.documento || '—'}</td>
                            <td
                              className={`py-2 px-3 text-right font-black tabular-nums whitespace-nowrap ${
                                l.tipo === 'desconto' ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {l.tipo === 'desconto' ? '-' : '+'} {formatBRL(l.valor)}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap ${
                                saldoAtual !== null && saldoAtual < -0.001
                                  ? 'text-red-600'
                                  : 'text-slate-700 dark:text-neutral-200'
                              }`}
                            >
                              {saldoAtual !== null ? formatBRL(saldoAtual) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA FICHA MANUAL */}
      {showNewFichaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Cadastrar Nova Ficha ({exercicio})
              </h4>
              <button
                type="button"
                onClick={() => setShowNewFichaModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddManualFicha} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-neutral-300 mb-1">Nº da Ficha *</label>
                  <input
                    type="text"
                    required
                    value={newFichaForm.ficha}
                    onChange={(e) => setNewFichaForm({ ...newFichaForm, ficha: e.target.value })}
                    placeholder="Ex: 437"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-neutral-300 mb-1">CLoc</label>
                  <input
                    type="text"
                    value={newFichaForm.cloc}
                    onChange={(e) => setNewFichaForm({ ...newFichaForm, cloc: e.target.value })}
                    placeholder="Ex: 040402"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-neutral-300 mb-1">Órgão / Secretaria</label>
                <input
                  type="text"
                  value={newFichaForm.orgao}
                  onChange={(e) => setNewFichaForm({ ...newFichaForm, orgao: e.target.value })}
                  placeholder="Ex: 04 - SECRETARIA MUNICIPAL DE EDUCACAO"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-neutral-300 mb-1">Ação / Descrição</label>
                <input
                  type="text"
                  value={newFichaForm.acaoDescricao}
                  onChange={(e) => setNewFichaForm({ ...newFichaForm, acaoDescricao: e.target.value })}
                  placeholder="Ex: Manutenção das Atividades..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-neutral-300 mb-1">Fonte de Recurso</label>
                  <input
                    type="text"
                    value={newFichaForm.fonteRecurso}
                    onChange={(e) => setNewFichaForm({ ...newFichaForm, fonteRecurso: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-neutral-300 mb-1">Dotação Atual (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newFichaForm.dotacaoAtual}
                    onChange={(e) =>
                      setNewFichaForm({ ...newFichaForm, dotacaoAtual: formatCurrencyInputPtBr(e.target.value) })
                    }
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewFichaModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Salvar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ZERAR FICHAS */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Zerar Fichas — Exercício {exercicio}
                </h4>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                  Esta ação removerá todas as <strong>{fichas.length}</strong> fichas e{' '}
                  <strong>{lancamentos.length}</strong> movimentações deste exercício para que você possa importar um novo PDF do zero.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearingFichas}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-xs font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleZerarFichas}
                disabled={clearingFichas}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-60"
              >
                <Trash2 size={14} />
                <span>{clearingFichas ? 'Zerando...' : 'Confirmar e Zerar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
