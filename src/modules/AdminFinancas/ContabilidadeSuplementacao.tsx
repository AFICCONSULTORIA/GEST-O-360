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
  Calendar,
  Cloud
} from 'lucide-react';
import { downloadWorkbookXlsx, SheetExportSpec } from '../../utils/spreadsheet';
import { supabase, supabaseAnon } from '../../lib/supabase';
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
  ParsedFichaOrcamentaria
} from './utils/fiorilliFichasParser'; import { bestEffort, reportError } from '../../lib/logger';

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
  // Trata entrada como reais inteiros por padrão (ex: 5000 -> 5.000),
  // permitindo centavos apenas se o usuário digitar vírgula (ex: 5000,50 -> 5.000,50)
  const cleaned = raw.replace(/[^\d,]/g, '');
  if (!cleaned) return '';

  const commaIdx = cleaned.indexOf(',');
  const intRaw = commaIdx >= 0 ? cleaned.slice(0, commaIdx) : cleaned;
  const decRaw = commaIdx >= 0 ? cleaned.slice(commaIdx + 1).replace(/,/g, '').slice(0, 2) : null;

  if (!intRaw && decRaw === null) return '';

  const intNum = intRaw ? Number(intRaw) : 0;
  const intFormatted = Number.isFinite(intNum) ? intNum.toLocaleString('pt-BR') : intRaw;

  return decRaw !== null ? `${intFormatted},${decRaw}` : intFormatted;
}

function finalizeCurrencyInputPtBr(raw: string): string {
  const formatted = formatCurrencyInputPtBr(raw);
  if (!formatted) return '';
  if (!formatted.includes(',')) return `${formatted},00`;
  const [intPart, decPart = ''] = formatted.split(',');
  return `${intPart},${decPart.padEnd(2, '0').slice(0, 2)}`;
}

function parseCurrencyInputPtBr(raw: string): number {
  if (!raw) return 0;
  const normalized = raw.trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLancamentoDateLabel(l: ContabilidadeLancamento): string {
  const match = l.observacao?.match(/Período:\s*(\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4})/);
  if (match) return match[1];
  return new Date(l.createdAt).toLocaleDateString('pt-BR');
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const ContabilidadeSuplementacao: React.FC<ContabilidadeSuplementacaoProps> = ({
  currentInstitution,
  currentUser,
}) => {
  const instId = currentInstitution?.id || currentUser?.institution_id || 'default';
  const candidateInstIds = useMemo(
    () => Array.from(new Set([instId, 'inst_1', 'default'].filter(Boolean))),
    [instId]
  );
  const [exercicio, setExercicio] = useState<number>(new Date().getFullYear());
  const [fichas, setFichas] = useState<ContabilidadeFicha[]>([]);
  const [lancamentos, setLancamentos] = useState<ContabilidadeLancamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const isImportingRef = useRef<boolean>(false);

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

  // Modal Cobrir Ficha Negativa (selecionar múltiplas fichas de origem -> destino negativa)
  const [cobrirTargetFicha, setCobrirTargetFicha] = useState<ContabilidadeFicha | null>(null);
  const [cobrirSources, setCobrirSources] = useState<Array<{ id: string; fichaOrigem: string; valor: string }>>([]);
  const [cobrirDecreto, setCobrirDecreto] = useState<string>('');
  const [cobrirData, setCobrirData] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [cobrirSaving, setCobrirSaving] = useState<boolean>(false);
  const [openOriginPickerId, setOpenOriginPickerId] = useState<string | null>(null);
  const [originPickerSearch, setOriginPickerSearch] = useState<string>('');

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
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'local'>('syncing');

  // Executa operação no Supabase com fallback automático para supabaseAnon caso RLS bloqueie sessão sem claim de tenant
  const runWithSupabaseFallback = async <T,>(
    op: (client: typeof supabase) => PromiseLike<{ data: T; error: any }>
  ): Promise<{ data: T; error: any }> => {
    const res = await op(supabase);
    if (!res.error) return res;
    return await op(supabaseAnon);
  };

  const toDbFichaRow = (
    f: ContabilidadeFicha,
    targetEx: number,
    updatedBy: string,
    nowIso: string,
    overrideInstId?: string,
    includeEmpenhado = true
  ) => ({
    institution_id: overrideInstId || instId,
    exercicio: targetEx,
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
    ...(includeEmpenhado ? { empenhado: f.empenhado ?? 0 } : {}),
    total_descontado: f.totalDescontado,
    total_suplementado: f.totalSuplementado,
    updated_by: updatedBy,
    updated_at: nowIso,
  });

  const upsertFichasCloud = async (
    rows: ContabilidadeFicha[],
    targetEx: number,
    updatedBy: string,
    nowIso: string
  ): Promise<boolean> => {
    if (rows.length === 0) return true;
    setCloudStatus('syncing');
    const CHUNK = 150;
    let savedToTable = true;
    let includeEmpenhado = true;

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunkRows = rows.slice(i, i + CHUNK);
      const slicePrimary = chunkRows.map((f) => toDbFichaRow(f, targetEx, updatedBy, nowIso, instId, includeEmpenhado));
      let { error } = await runWithSupabaseFallback((client) =>
        client.from('fin_contabilidade_fichas').upsert(slicePrimary, { onConflict: 'institution_id,exercicio,ficha' })
      );

      // Se a coluna empenhado ainda não existir no banco remoto, reenvia sem ela
      if (error && includeEmpenhado && String(error.message || '').includes('empenhado')) {
        includeEmpenhado = false;
        const sliceNoEmp = chunkRows.map((f) => toDbFichaRow(f, targetEx, updatedBy, nowIso, instId, false));
        const retryNoEmp = await runWithSupabaseFallback((client) =>
          client.from('fin_contabilidade_fichas').upsert(sliceNoEmp, { onConflict: 'institution_id,exercicio,ficha' })
        );
        error = retryNoEmp.error;
      }

      // Se o usuário não-administrador tiver seu instId bloqueado por RLS, faz fallback imediato para 'default' (permitido pela policy para todos os perfis)
      if (error && instId !== 'default') {
        const sliceDefault = chunkRows.map((f) => toDbFichaRow(f, targetEx, updatedBy, nowIso, 'default', includeEmpenhado));
        const retryDefault = await runWithSupabaseFallback((client) =>
          client.from('fin_contabilidade_fichas').upsert(sliceDefault, { onConflict: 'institution_id,exercicio,ficha' })
        );
        error = retryDefault.error;
      }

      if (error) {
        console.warn('[Contabilidade] Aviso ao salvar lote em fin_contabilidade_fichas, acionando fallback institutions.notes:', error);
        savedToTable = false;
        break;
      }
    }

    // Fallback e espelhamento em nuvem via institutions.notes para funcionar mesmo quando RLS de tabela bloquear perfis não-admin
    try {
      const targetNoteInst = instId === 'default' ? 'inst_1' : instId;
      let { data: instData } = await runWithSupabaseFallback((client) =>
        client.from('institutions').select('notes').eq('id', targetNoteInst).maybeSingle()
      );
      let notesObj: Record<string, any> = {};
      if (instData?.notes) {
        try {
          notesObj = JSON.parse(instData.notes);
        } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
      }
      notesObj[`contabilidade_fichas_${targetEx}`] = rows;
      const { error: notesErr } = await runWithSupabaseFallback((client) =>
        client.from('institutions').update({ notes: JSON.stringify(notesObj) }).eq('id', targetNoteInst)
      );
      if (!notesErr) {
        savedToTable = true;
      }
    } catch (caughtErr) { reportError('ContabilidadeSuplementacao:rede', caughtErr); }

    setCloudStatus(savedToTable ? 'synced' : 'local');
    return savedToTable;
  };

  const persistLocal = (
    nextFichas: ContabilidadeFicha[],
    nextLanc: ContabilidadeLancamento[],
    customExercicio?: number
  ) => {
    const targetEx = customExercicio ?? exercicio;
    try {
      localStorage.setItem(`fin_contab_fichas_${instId}_${targetEx}`, JSON.stringify(nextFichas));
      localStorage.setItem(`fin_contab_lanc_${instId}_${targetEx}`, JSON.stringify(nextLanc));
      if (instId !== 'default') {
        localStorage.setItem(`fin_contab_fichas_default_${targetEx}`, JSON.stringify(nextFichas));
        localStorage.setItem(`fin_contab_lanc_default_${targetEx}`, JSON.stringify(nextLanc));
      }
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
          id: generateUUID(),
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

      await upsertFichasCloud(added, exercicio, currentUser?.name || 'Sincronização Frotas', nowIso);

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
      if (isImportingRef.current) return;
      setLoading(true);
      setCloudStatus('syncing');
      let loadedFichas: ContabilidadeFicha[] = [];
      let loadedLanc: ContabilidadeLancamento[] = [];
      let loadedFromRemote = false;

      try {
        // Consulta tanto no cliente autenticado quanto no cliente anônimo (evita retorno vazio silencioso por RLS em SELECT)
        const fetchFichasFromClient = (client: typeof supabase) =>
          client
            .from('fin_contabilidade_fichas')
            .select('*')
            .in('institution_id', candidateInstIds)
            .eq('exercicio', exercicio)
            .order('ficha', { ascending: true });

        const fetchLancFromClient = (client: typeof supabase) =>
          client
            .from('fin_contabilidade_lancamentos')
            .select('*')
            .in('institution_id', candidateInstIds)
            .eq('exercicio', exercicio)
            .order('created_at', { ascending: false })
            .limit(500);

        const [authFichasRes, anonFichasRes, authLancRes, anonLancRes] = await Promise.all([
          fetchFichasFromClient(supabase),
          fetchFichasFromClient(supabaseAnon),
          fetchLancFromClient(supabase),
          fetchLancFromClient(supabaseAnon),
        ]);

        const rawFichasRows = [
          ...(Array.isArray(authFichasRes.data) ? authFichasRes.data : []),
          ...(Array.isArray(anonFichasRes.data) ? anonFichasRes.data : []),
        ];

        const rawLancRows = [
          ...(Array.isArray(authLancRes.data) ? authLancRes.data : []),
          ...(Array.isArray(anonLancRes.data) ? anonLancRes.data : []),
        ];

        if (!cancelled && (!authFichasRes.error || !anonFichasRes.error)) {
          loadedFromRemote = true;
          const byFicha = new Map<string, ContabilidadeFicha>();
          for (const row of rawFichasRows as any[]) {
            const key = String(row.ficha);
            const existing = byFicha.get(key);
            const rowUpdated = row.updated_at || '';
            if (!existing || rowUpdated >= existing.updatedAt) {
              byFicha.set(key, {
                id: row.id,
                exercicio: row.exercicio,
                ficha: key,
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
                empenhado: Number(row.empenhado) || 0,
                totalDescontado: Number(row.total_descontado) || 0,
                totalSuplementado: Number(row.total_suplementado) || 0,
                updatedAt: row.updated_at || new Date().toISOString(),
              });
            }
          }
          loadedFichas = Array.from(byFicha.values()).sort((a, b) =>
            a.ficha.localeCompare(b.ficha, 'pt-BR', { numeric: true })
          );

          const byLancId = new Map<string, ContabilidadeLancamento>();
          for (const l of rawLancRows as any[]) {
            if (!l?.id || byLancId.has(l.id)) continue;
            byLancId.set(l.id, {
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
            });
          }
          loadedLanc = Array.from(byLancId.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        // Fallback via institutions.notes caso a tabela retorne vazia para o perfil
        if (!cancelled && loadedFichas.length === 0) {
          const targetNoteInst = instId === 'default' ? 'inst_1' : instId;
          const { data: instData } = await runWithSupabaseFallback((client) =>
            client.from('institutions').select('notes').eq('id', targetNoteInst).maybeSingle()
          );
          if (instData?.notes) {
            try {
              const notesObj = JSON.parse(instData.notes);
              const savedNoteFichas = notesObj?.[`contabilidade_fichas_${exercicio}`];
              if (Array.isArray(savedNoteFichas) && savedNoteFichas.length > 0) {
                loadedFichas = savedNoteFichas;
                loadedFromRemote = true;
              }
            } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
          }
        }
      } catch {
        // Fallback para localStorage abaixo
      }

      // Se houver dados salvos apenas localmente (localStorage) que ainda não subiram para a nuvem, envia automaticamente
      try {
        const rawF =
          localStorage.getItem(storageFichasKey) ||
          localStorage.getItem(`fin_contab_fichas_default_${exercicio}`);
        const rawL =
          localStorage.getItem(storageLancKey) ||
          localStorage.getItem(`fin_contab_lanc_default_${exercicio}`);
        const localFichas: ContabilidadeFicha[] = rawF ? JSON.parse(rawF) : [];
        const localLanc: ContabilidadeLancamento[] = rawL ? JSON.parse(rawL) : [];

        if (!loadedFromRemote) {
          loadedFichas = localFichas;
          loadedLanc = localLanc;
        } else {
          const remoteFichaKeys = new Set(loadedFichas.map((f) => f.ficha));
          const missingLocalFichas = localFichas.filter((f) => !remoteFichaKeys.has(f.ficha));
          if (missingLocalFichas.length > 0) {
            loadedFichas = [...loadedFichas, ...missingLocalFichas].sort((a, b) =>
              a.ficha.localeCompare(b.ficha, 'pt-BR', { numeric: true })
            );
            await upsertFichasCloud(
              missingLocalFichas,
              exercicio,
              currentUser?.name || 'Sincronização Automática',
              new Date().toISOString()
            );
          }

          const remoteLancIds = new Set(loadedLanc.map((l) => l.id));
          const missingLocalLanc = localLanc.filter((l) => !remoteLancIds.has(l.id));
          if (missingLocalLanc.length > 0) {
            loadedLanc = [...missingLocalLanc, ...loadedLanc];
            let { error: lancSyncErr } = await runWithSupabaseFallback((client) =>
              client.from('fin_contabilidade_lancamentos').insert(
                missingLocalLanc.map((l) => ({
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
              )
            );
            if (lancSyncErr && instId !== 'default') {
              await runWithSupabaseFallback((client) =>
                client.from('fin_contabilidade_lancamentos').insert(
                  missingLocalLanc.map((l) => ({
                    id: l.id,
                    institution_id: 'default',
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
                )
              );
            }
          }
        }
      } catch {
        // ignore localStorage parse errors
      }

      if (!cancelled && !isImportingRef.current) {
        setCloudStatus(loadedFromRemote ? 'synced' : 'local');
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
  }, [instId, candidateInstIds, exercicio, storageFichasKey, storageLancKey]);

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
    const parseBrToIso = (br: string) => {
      const [d, m, y] = br.split('/');
      return `${y}-${m}-${d}`;
    };

    return lancamentos.filter((l) => {
      const startIso = (l.createdAt || '').slice(0, 10);
      const rangeMatch = l.observacao?.match(/Período:\s*(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/);
      const itemStart = rangeMatch ? parseBrToIso(rangeMatch[1]) : startIso;
      const itemEnd = rangeMatch ? parseBrToIso(rangeMatch[2]) : startIso;

      if (dataInicioFilter && itemEnd < dataInicioFilter) return false;
      if (dataFimFilter && itemStart > dataFimFilter) return false;
      return true;
    });
  }, [lancamentos, dataInicioFilter, dataFimFilter]);

  const consolidatedPeriodoFichas = useMemo(() => {
    const fichaByNum = new Map<string, ContabilidadeFicha>(fichas.map((f) => [f.ficha, f]));
    const grouped = new Map<
      string,
      {
        ficha: string;
        orgao: string;
        acaoDescricao: string;
        lancamentosCount: number;
        totalDescontado: number;
        totalSuplementado: number;
        decretos: string[];
        origensMap: Map<string, number>;
        destinosMap: Map<string, number>;
        saldoAtualFicha: number | null;
      }
    >();

    for (const l of filteredLancamentos) {
      const fObj = fichaByNum.get(l.ficha);
      const existing = grouped.get(l.ficha) || {
        ficha: l.ficha,
        orgao: fObj?.orgao || '—',
        acaoDescricao: fObj?.acaoDescricao || fObj?.especificacao || '',
        lancamentosCount: 0,
        totalDescontado: 0,
        totalSuplementado: 0,
        decretos: [],
        origensMap: new Map<string, number>(),
        destinosMap: new Map<string, number>(),
        saldoAtualFicha: fObj ? getSaldoFicha(fObj) : null,
      };

      existing.lancamentosCount += 1;
      if (l.tipo === 'desconto') {
        existing.totalDescontado = Number((existing.totalDescontado + l.valor).toFixed(2));
        if (l.fichaContrapartida) {
          existing.destinosMap.set(
            l.fichaContrapartida,
            Number(((existing.destinosMap.get(l.fichaContrapartida) || 0) + l.valor).toFixed(2))
          );
        }
      } else {
        existing.totalSuplementado = Number((existing.totalSuplementado + l.valor).toFixed(2));
        if (l.fichaContrapartida) {
          existing.origensMap.set(
            l.fichaContrapartida,
            Number(((existing.origensMap.get(l.fichaContrapartida) || 0) + l.valor).toFixed(2))
          );
        }
      }
      if (l.documento && !existing.decretos.includes(l.documento)) {
        existing.decretos.push(l.documento);
      }
      grouped.set(l.ficha, existing);
    }

    return Array.from(grouped.values())
      .map((item) => ({
        ficha: item.ficha,
        orgao: item.orgao,
        acaoDescricao: item.acaoDescricao,
        lancamentosCount: item.lancamentosCount,
        totalDescontado: item.totalDescontado,
        totalSuplementado: item.totalSuplementado,
        decretos: item.decretos,
        origens: Array.from(item.origensMap.entries()).map(([fichaOrigem, valor]) => ({ fichaOrigem, valor })),
        destinos: Array.from(item.destinosMap.entries()).map(([fichaDestino, valor]) => ({ fichaDestino, valor })),
        saldoAtualFicha: item.saldoAtualFicha,
      }))
      .sort((a, b) => a.ficha.localeCompare(b.ficha, 'pt-BR', { numeric: true }));
  }, [filteredLancamentos, fichas]);

  // Mapa detalhado de transferências Origem (retirada) -> Destino (suplementada) no período
  const origemDestinoPairs = useMemo(() => {
    const fichaByNum = new Map<string, ContabilidadeFicha>(fichas.map((f) => [f.ficha, f]));
    const pairMap = new Map<
      string,
      {
        fichaOrigem: string;
        origemDesc: string;
        fichaDestino: string;
        destinoDesc: string;
        valorTotal: number;
        decretos: string[];
        datas: string[];
      }
    >();

    for (const l of filteredLancamentos) {
      if (l.tipo !== 'suplementacao' || !l.fichaContrapartida) continue;
      const key = `${l.fichaContrapartida}=>${l.ficha}`;
      const origObj = fichaByNum.get(l.fichaContrapartida);
      const destObj = fichaByNum.get(l.ficha);
      const entry = pairMap.get(key) || {
        fichaOrigem: l.fichaContrapartida,
        origemDesc: origObj?.acaoDescricao || origObj?.orgao || '',
        fichaDestino: l.ficha,
        destinoDesc: destObj?.acaoDescricao || destObj?.orgao || '',
        valorTotal: 0,
        decretos: [],
        datas: [],
      };
      entry.valorTotal = Number((entry.valorTotal + l.valor).toFixed(2));
      if (l.documento && !entry.decretos.includes(l.documento)) entry.decretos.push(l.documento);
      const dt = formatLancamentoDateLabel(l);
      if (dt && !entry.datas.includes(dt)) entry.datas.push(dt);
      pairMap.set(key, entry);
    }

    return Array.from(pairMap.values()).sort((a, b) => {
      const cmpDest = a.fichaDestino.localeCompare(b.fichaDestino, 'pt-BR', { numeric: true });
      return cmpDest !== 0 ? cmpDest : a.fichaOrigem.localeCompare(b.fichaOrigem, 'pt-BR', { numeric: true });
    });
  }, [filteredLancamentos, fichas]);

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

  // Exportar Relatório do Período para Excel (somado por ficha + aba Origem -> Destino)
  const handleExportPeriodoExcel = () => {
    if (consolidatedPeriodoFichas.length === 0) {
      showToast('Não há lançamentos no intervalo selecionado para exportar.', 'warning');
      return;
    }
    const rows: Record<string, unknown>[] = consolidatedPeriodoFichas.map((item) => ({
      Ficha: item.ficha,
      Orgao: item.orgao,
      Acao: item.acaoDescricao,
      Decretos: item.decretos.join(', '),
      'Qtd. Mov.': item.lancamentosCount,
      'Descontado (-)': item.totalDescontado,
      'Suplementado (+)': item.totalSuplementado,
      'Líquido Período': item.totalSuplementado - item.totalDescontado,
      'Retirado de (Origem)': item.origens.map((o) => `Ficha ${o.fichaOrigem}: ${formatBRL(o.valor)}`).join(' | '),
      'Destinado para': item.destinos.map((d) => `Ficha ${d.fichaDestino}: ${formatBRL(d.valor)}`).join(' | '),
      'Saldo Atual da Ficha': item.saldoAtualFicha ?? 0,
    }));
    rows.push({
      Ficha: 'TOTAL',
      Orgao: `${periodoStats.fichasCount} ficha(s) movimentada(s)`,
      Acao: `${periodoStats.count} lançamento(s) no período`,
      Decretos: formatPeriodLabel(),
      'Qtd. Mov.': periodoStats.count,
      'Descontado (-)': periodoStats.totalDescontado,
      'Suplementado (+)': periodoStats.totalSuplementado,
      'Líquido Período': periodoStats.totalSuplementado - periodoStats.totalDescontado,
      'Retirado de (Origem)': '',
      'Destinado para': '',
      'Saldo Atual da Ficha': '',
    });

    const sheets: SheetExportSpec[] = [
      {
        name: 'Resumo_Por_Ficha',
        rows,
        colWidths: [10, 30, 34, 20, 10, 16, 16, 16, 36, 36, 18],
      },
    ];

    if (origemDestinoPairs.length > 0) {
      sheets.push({
        name: 'Mapa_Origem_Destino',
        rows: origemDestinoPairs.map((p) => ({
          'Ficha Suplementada (Destino)': p.fichaDestino,
          'Descrição Destino': p.destinoDesc,
          'Ficha de Origem (Retirada)': p.fichaOrigem,
          'Descrição Origem': p.origemDesc,
          'Valor Retirado (R$)': p.valorTotal,
          Decretos: p.decretos.join(', '),
          Datas: p.datas.join(', '),
        })),
      });
    }

    void downloadWorkbookXlsx(
      sheets,
      `Relatorio_Suplementacao_${exercicio}_${dataInicioFilter || 'inicio'}_${dataFimFilter || 'fim'}.xlsx`
    );
    showToast('Relatório do período exportado em Excel!', 'success');
  };

  // Imprimir / Salvar PDF do Relatório do Período (somado por ficha + mapa Origem -> Destino)
  const handlePrintPeriodoReport = () => {
    const win = window.open('', '_blank', 'width=1100,height=780');
    if (!win) {
      showToast('Permita pop-ups para imprimir o relatório.', 'warning');
      return;
    }
    const instName = currentInstitution?.name || 'CONTABILIDADE MUNICIPAL';
    const rowsHtml = consolidatedPeriodoFichas
      .map((item, idx) => {
        const liquido = item.totalSuplementado - item.totalDescontado;
        const isNeg = item.saldoAtualFicha !== null && item.saldoAtualFicha < -0.001;
        const vinculosParts: string[] = [];
        if (item.origens.length > 0) {
          vinculosParts.push(
            `<strong>Veio de:</strong> ${item.origens
              .map((o) => `Ficha ${o.fichaOrigem} (${formatBRL(o.valor)})`)
              .join(' • ')}`
          );
        }
        if (item.destinos.length > 0) {
          vinculosParts.push(
            `<strong>Foi p/:</strong> ${item.destinos
              .map((d) => `Ficha ${d.fichaDestino} (${formatBRL(d.valor)})`)
              .join(' • ')}`
          );
        }
        return `
          <tr style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}">
            <td class="nowrap strong center">${item.ficha}</td>
            <td>
              <div class="strong">${item.orgao}</div>
              ${item.acaoDescricao ? `<div class="muted">${item.acaoDescricao}</div>` : ''}
              ${vinculosParts.length > 0 ? `<div class="muted" style="color:#3730a3;margin-top:2px">${vinculosParts.join('<br/>')}</div>` : ''}
            </td>
            <td class="nowrap">${item.decretos.length > 0 ? item.decretos.join(', ') : '—'}</td>
            <td class="nowrap center">${item.lancamentosCount}</td>
            <td class="nowrap num strong" style="color:#be123c">
              ${item.totalDescontado > 0 ? `- ${formatBRL(item.totalDescontado)}` : '—'}
            </td>
            <td class="nowrap num strong" style="color:#047857">
              ${item.totalSuplementado > 0 ? `+ ${formatBRL(item.totalSuplementado)}` : '—'}
            </td>
            <td class="nowrap num strong" style="color:${liquido < 0 ? '#be123c' : liquido > 0 ? '#047857' : '#0f172a'}">
              ${liquido < 0 ? '-' : liquido > 0 ? '+' : ''} ${formatBRL(Math.abs(liquido))}
            </td>
            <td class="nowrap num strong" style="color:${isNeg ? '#dc2626' : '#0f172a'}">
              ${item.saldoAtualFicha !== null ? formatBRL(item.saldoAtualFicha) : '—'}
            </td>
          </tr>
        `;
      })
      .join('');

    const mapaPairsHtml = origemDestinoPairs.length > 0
      ? `
        <h2 style="font-size:13px;font-weight:800;text-transform:uppercase;margin:18px 0 6px;color:#1e293b;border-left:4px solid #4f46e5;padding-left:8px;">
          Mapa de Remanejamento: De Qual Ficha Foi Retirado → Ficha Suplementada
        </h2>
        <table>
          <thead>
            <tr>
              <th style="width:90px;text-align:center">Ficha Supl.</th>
              <th>Destino (Ficha Suplementada)</th>
              <th style="width:95px;text-align:center">Ficha Origem</th>
              <th>Origem (De Onde Foi Retirado)</th>
              <th style="width:115px">Decretos / Data</th>
              <th style="width:125px;text-align:right">Valor Retirado</th>
            </tr>
          </thead>
          <tbody>
            ${origemDestinoPairs
              .map(
                (p, idx) => `
              <tr style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}">
                <td class="nowrap strong center" style="color:#047857">Ficha ${p.fichaDestino}</td>
                <td>${p.destinoDesc || '—'}</td>
                <td class="nowrap strong center" style="color:#be123c">Ficha ${p.fichaOrigem}</td>
                <td>${p.origemDesc || '—'}</td>
                <td class="nowrap">${[...p.decretos, ...p.datas].join(' • ') || '—'}</td>
                <td class="nowrap num strong" style="color:#1e293b">${formatBRL(p.valorTotal)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `
      : '';

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
              <th style="width:62px;text-align:center">Ficha</th>
              <th>Órgão / Ação / Origem-Destino</th>
              <th style="width:115px">Decretos</th>
              <th style="width:48px;text-align:center">Mov.</th>
              <th style="width:112px;text-align:right">Descontado (-)</th>
              <th style="width:112px;text-align:right">Suplementado (+)</th>
              <th style="width:112px;text-align:right">Líquido Período</th>
              <th style="width:118px;text-align:right">Saldo Atual Ficha</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align:center;padding:18px;color:#64748b">Nenhum lançamento encontrado no período selecionado.</td></tr>'}
          </tbody>
          ${consolidatedPeriodoFichas.length > 0 ? `
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right">TOTAIS DO PERÍODO (${periodoStats.fichasCount} FICHAS / ${periodoStats.count} LANÇAMENTOS):</td>
              <td class="num" style="color:#be123c">- ${formatBRL(periodoStats.totalDescontado)}</td>
              <td class="num" style="color:#047857">+ ${formatBRL(periodoStats.totalSuplementado)}</td>
              <td class="num" style="color:${saldoLiquido < 0 ? '#be123c' : '#047857'}">${saldoLiquido < 0 ? '-' : '+'} ${formatBRL(Math.abs(saldoLiquido))}</td>
              <td class="num">—</td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        ${mapaPairsHtml}

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

  const valorNumericoPreview = useMemo(() => parseCurrencyInputPtBr(valorInput), [valorInput]);

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
    isImportingRef.current = true;

    try {
      const lowerName = (file.name || '').toLowerCase();
      const isPdfFile = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
      const parsed = isPdfFile
        ? await parseFiorilliFichasPdf(file)
        : await parseFichasSpreadsheet(file);

      if (!parsed.fichas || parsed.fichas.length === 0) {
        showToast('Nenhuma ficha orçamentária foi identificada no arquivo enviado.', 'warning');
        return;
      }

      const targetExercicio = parsed.exercicio || exercicio;

      // Preserva descontos/suplementações manuais já lançados para fichas de mesmo número, se houver
      const existingByFicha = new Map<string, ContabilidadeFicha>(fichas.map((f) => [f.ficha, f]));
      const nowIso = new Date().toISOString();

      const nextFichas: ContabilidadeFicha[] = parsed.fichas.map((item) => {
        const prev = existingByFicha.get(item.ficha);
        return {
          ...item,
          id: prev?.id || generateUUID(),
          exercicio: targetExercicio,
          totalDescontado: prev?.totalDescontado || 0,
          totalSuplementado: prev?.totalSuplementado || 0,
          updatedAt: nowIso,
        };
      });

      // Salva primeiro no cache local com o exercício de destino correto (evita race condition ao mudar de exercício)
      persistLocal(nextFichas, lancamentos, targetExercicio);
      setFichas(nextFichas);
      if (targetExercicio !== exercicio) {
        setExercicio(targetExercicio);
      }

      // Persiste em lote no Supabase (com fallback automático para 'default' e institutions.notes)
      const savedCloud = await upsertFichasCloud(
        nextFichas,
        targetExercicio,
        currentUser?.name || 'Contabilidade',
        nowIso
      );

      showToast(
        savedCloud
          ? `${nextFichas.length} fichas carregadas e salvas na nuvem (${parsed.municipio} • Exercício ${targetExercicio})!`
          : `${nextFichas.length} fichas carregadas localmente, mas houve falha ao sincronizar na nuvem.`,
        savedCloud ? 'success' : 'warning'
      );
    } catch (err: any) {
      console.error('Erro ao ler arquivo de fichas:', err);
      showToast(
        `Erro ao processar o arquivo: ${err?.message || 'Verifique se é um PDF Fiorilli ou planilha válida.'}`,
        'error'
      );
    } finally {
      isImportingRef.current = false;
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

    const valor = parseCurrencyInputPtBr(valorInput);
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
        id: generateUUID(),
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
        id: generateUUID(),
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
        id: generateUUID(),
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

    // Persiste no Supabase em background com fallback automático
    try {
      setCloudStatus('syncing');
      let hasError = false;
      for (const f of updatedFichasMap.values()) {
        const { error: upErr } = await runWithSupabaseFallback((client) =>
          client
            .from('fin_contabilidade_fichas')
            .update({
              total_descontado: f.totalDescontado,
              total_suplementado: f.totalSuplementado,
              updated_by: userLabel,
              updated_at: nowIso,
            })
            .in('institution_id', candidateInstIds)
            .eq('exercicio', exercicio)
            .eq('ficha', f.ficha)
        );
        if (upErr) hasError = true;
      }

      let { error: insErr } = await runWithSupabaseFallback((client) =>
        client.from('fin_contabilidade_lancamentos').insert(
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
        )
      );
      if (insErr && instId !== 'default') {
        const retryDefault = await runWithSupabaseFallback((client) =>
          client.from('fin_contabilidade_lancamentos').insert(
            newLancs.map((l) => ({
              id: l.id,
              institution_id: 'default',
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
          )
        );
        insErr = retryDefault.error;
      }
      if (insErr) hasError = true;
      setCloudStatus(hasError ? 'local' : 'synced');
    } catch {
      setCloudStatus('local');
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
        await runWithSupabaseFallback((client) =>
          client
            .from('fin_contabilidade_fichas')
            .update({
              total_descontado: updated.totalDescontado,
              total_suplementado: updated.totalSuplementado,
              updated_at: nowIso,
            })
            .eq('institution_id', instId)
            .eq('exercicio', exercicio)
            .eq('ficha', target.ficha)
        );
      } catch {
        // ignore
      }
    }

    const nextLanc = lancamentos.filter((l) => l.id !== lanc.id);
    setFichas(nextFichas);
    setLancamentos(nextLanc);
    persistLocal(nextFichas, nextLanc);

    try {
      await runWithSupabaseFallback((client) =>
        client.from('fin_contabilidade_lancamentos').delete().eq('id', lanc.id)
      );
    } catch {
      // ignore
    }

    showToast(`Lançamento na Ficha ${lanc.ficha} estornado e saldo recalculado.`, 'info');
  };

  // Zerar todas as fichas e lançamentos do exercício atual
  const handleZerarFichas = async () => {
    setClearingFichas(true);
    try {
      await runWithSupabaseFallback((client) =>
        client
          .from('fin_contabilidade_lancamentos')
          .delete()
          .eq('institution_id', instId)
          .eq('exercicio', exercicio)
      );
      await runWithSupabaseFallback((client) =>
        client
          .from('fin_contabilidade_fichas')
          .delete()
          .eq('institution_id', instId)
          .eq('exercicio', exercicio)
      );
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

  // Abre o assistente de suplementação de ficha negativa selecionando de quais fichas retirar saldo
  const openCobrirModal = (target: ContabilidadeFicha) => {
    const ultimoDecretoDaFicha = lancamentos.find((l) => l.ficha === target.ficha && l.documento)?.documento;
    const ultimoDecretoGeral = lancamentos.find((l) => l.documento)?.documento;
    setCobrirTargetFicha(target);
    setCobrirDecreto(documentoInput.trim() || ultimoDecretoDaFicha || ultimoDecretoGeral || '');
    setCobrirData(dataLancamentoInput || new Date().toISOString().slice(0, 10));
    setCobrirSources([{ id: crypto.randomUUID(), fichaOrigem: '', valor: '' }]);
    setOpenOriginPickerId(null);
    setOriginPickerSearch('');
  };

  // Imprime de uma só vez o mapa geral de todas as suplementações (Origem -> Destino) e fichas negativas
  const handlePrintMapaGeralCobertura = () => {
    const fichaByNum = new Map<string, ContabilidadeFicha>(fichas.map((f) => [f.ficha, f]));
    const allTransfers = lancamentos.filter((l) => l.tipo === 'suplementacao' && l.fichaContrapartida);
    const groupedMap = new Map<
      string,
      {
        fichaDestino: string;
        destinoObj?: ContabilidadeFicha;
        totalSuplementado: number;
        itensMap: Map<
          string,
          {
            fichaOrigem: string;
            origemObj?: ContabilidadeFicha;
            valor: number;
            decretos: string[];
            datas: string[];
          }
        >;
      }
    >();

    // Soma total retirado por ficha de origem em TODO o relatório (ex: Ficha 116 somada com Ficha 116)
    const origemConsolidadaMap = new Map<
      string,
      {
        fichaOrigem: string;
        origemObj?: ContabilidadeFicha;
        totalRetirado: number;
        destinosMap: Map<string, number>;
      }
    >();

    for (const l of allTransfers) {
      const origId = l.fichaContrapartida!;
      const group = groupedMap.get(l.ficha) || {
        fichaDestino: l.ficha,
        destinoObj: fichaByNum.get(l.ficha),
        totalSuplementado: 0,
        itensMap: new Map(),
      };
      group.totalSuplementado = Number((group.totalSuplementado + l.valor).toFixed(2));

      const existingItem = group.itensMap.get(origId) || {
        fichaOrigem: origId,
        origemObj: fichaByNum.get(origId),
        valor: 0,
        decretos: [],
        datas: [],
      };
      existingItem.valor = Number((existingItem.valor + l.valor).toFixed(2));
      if (l.documento && !existingItem.decretos.includes(l.documento)) existingItem.decretos.push(l.documento);
      const dtLabel = formatLancamentoDateLabel(l);
      if (dtLabel && !existingItem.datas.includes(dtLabel)) existingItem.datas.push(dtLabel);
      group.itensMap.set(origId, existingItem);
      groupedMap.set(l.ficha, group);

      const origCons = origemConsolidadaMap.get(origId) || {
        fichaOrigem: origId,
        origemObj: fichaByNum.get(origId),
        totalRetirado: 0,
        destinosMap: new Map(),
      };
      origCons.totalRetirado = Number((origCons.totalRetirado + l.valor).toFixed(2));
      origCons.destinosMap.set(
        l.ficha,
        Number(((origCons.destinosMap.get(l.ficha) || 0) + l.valor).toFixed(2))
      );
      origemConsolidadaMap.set(origId, origCons);
    }

    const groups = Array.from(groupedMap.values())
      .map((g) => ({
        fichaDestino: g.fichaDestino,
        destinoObj: g.destinoObj,
        totalSuplementado: g.totalSuplementado,
        itens: Array.from(g.itensMap.values()).sort((a, b) =>
          a.fichaOrigem.localeCompare(b.fichaOrigem, 'pt-BR', { numeric: true })
        ),
      }))
      .sort((a, b) => a.fichaDestino.localeCompare(b.fichaDestino, 'pt-BR', { numeric: true }));

    const origensConsolidadas = Array.from(origemConsolidadaMap.values()).sort((a, b) =>
      a.fichaOrigem.localeCompare(b.fichaOrigem, 'pt-BR', { numeric: true })
    );

    if (groups.length === 0 && totals.negativas.length === 0) {
      showToast('Não há suplementações vinculadas nem fichas negativas para imprimir.', 'warning');
      return;
    }

    const win = window.open('', '_blank', 'width=1100,height=780');
    if (!win) {
      showToast('Permita pop-ups para imprimir o mapa geral.', 'warning');
      return;
    }

    const totalGeralRemanejado = groups.reduce((acc, g) => acc + g.totalSuplementado, 0);

    const groupsHtml = groups
      .map((g) => {
        const rows = g.itens
          .map(
            (it) => `<tr>
              <td style="font-weight:800;text-align:center;color:#be123c">Ficha ${it.fichaOrigem}</td>
              <td><strong>${it.origemObj?.acaoDescricao || it.origemObj?.especificacao || '—'}</strong><div style="font-size:10px;color:#64748b">${it.origemObj?.orgao || ''}${it.origemObj?.categoria ? ` • Natureza: ${it.origemObj.categoria}${it.origemObj.especificacao ? ` (${it.origemObj.especificacao})` : ''}` : ''}${it.origemObj?.fonteRecurso ? ` • Fonte: ${it.origemObj.fonteRecurso}` : ''}</div></td>
              <td style="text-align:center">${it.decretos.join(', ') || '—'}</td>
              <td style="text-align:center">${it.datas.join(', ') || '—'}</td>
              <td class="num" style="color:#be123c">- ${formatBRL(it.valor)}</td>
            </tr>`
          )
          .join('');
        return `
          <div class="group-box">
            <div class="group-head">
              <div>
                <strong>Ficha Suplementada: ${g.fichaDestino}</strong> — ${g.destinoObj?.acaoDescricao || g.destinoObj?.especificacao || '—'}
                <div style="font-size:10px;color:#475569">${g.destinoObj?.orgao || ''}${g.destinoObj?.categoria ? ` • Natureza: ${g.destinoObj.categoria}${g.destinoObj.especificacao ? ` (${g.destinoObj.especificacao})` : ''}` : ''}${g.destinoObj?.fonteRecurso ? ` • Fonte: ${g.destinoObj.fonteRecurso}` : ''}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:9px;text-transform:uppercase;color:#64748b">Total Suplementado</div>
                <div style="font-size:13px;font-weight:800;color:#047857">+ ${formatBRL(g.totalSuplementado)}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:90px;text-align:center">Ficha Origem</th>
                  <th>Órgão / Ação / Fonte da Ficha de Origem (Retirada)</th>
                  <th style="width:100px;text-align:center">Decreto</th>
                  <th style="width:120px;text-align:center">Data / Período</th>
                  <th style="width:130px;text-align:right">Valor Retirado</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      })
      .join('');

    const origensConsolidadasHtml = origensConsolidadas.length > 0
      ? `
        <h2 style="font-size:13px;text-transform:uppercase;margin:16px 0 6px;color:#1e293b;border-left:4px solid #4f46e5;padding-left:8px;">
          Resumo Consolidado por Ficha de Origem (Total Somado Retirado de Cada Ficha)
        </h2>
        <table>
          <thead>
            <tr>
              <th style="width:90px;text-align:center">Ficha Origem</th>
              <th>Projeto/Atividade / Natureza / Fonte</th>
              <th>Fichas Suplementadas (Destino)</th>
              <th style="width:140px;text-align:right">Total Retirado (-)</th>
            </tr>
          </thead>
          <tbody>
            ${origensConsolidadas
              .map((oc) => {
                const destList = Array.from(oc.destinosMap.entries())
                  .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))
                  .map(([dFicha, dVal]) => `Ficha ${dFicha} (${formatBRL(dVal)})`)
                  .join(' • ');
                return `<tr>
                  <td style="text-align:center;font-weight:800;color:#be123c">Ficha ${oc.fichaOrigem}</td>
                  <td><strong>${oc.origemObj?.acaoDescricao || oc.origemObj?.especificacao || '—'}</strong><div style="font-size:10px;color:#64748b">${oc.origemObj?.orgao || ''}${oc.origemObj?.categoria ? ` • Natureza: ${oc.origemObj.categoria}` : ''}${oc.origemObj?.fonteRecurso ? ` • Fonte: ${oc.origemObj.fonteRecurso}` : ''}</div></td>
                  <td style="font-size:10.5px">${destList}</td>
                  <td class="num" style="color:#be123c">- ${formatBRL(oc.totalRetirado)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9">
              <td colspan="3" style="text-align:right;font-weight:800">TOTAL GERAL RETIRADO (${origensConsolidadas.length} FICHAS DE ORIGEM):</td>
              <td class="num" style="color:#be123c">- ${formatBRL(totalGeralRemanejado)}</td>
            </tr>
          </tfoot>
        </table>
      `
      : '';

    const negativasHtml = totals.negativas.length > 0
      ? `
        <h2 style="font-size:13px;text-transform:uppercase;margin:16px 0 6px;color:#b91c1c;border-left:4px solid #dc2626;padding-left:8px;">
          Fichas Ainda Negativas (Pendentes de Suplementação)
        </h2>
        <table>
          <thead>
            <tr>
              <th style="width:80px;text-align:center">Ficha</th>
              <th>Órgão / Ação</th>
              <th style="width:180px">Fonte de Recurso</th>
              <th style="width:130px;text-align:right">Saldo Atual</th>
              <th style="width:130px;text-align:right">Valor p/ Cobrir</th>
            </tr>
          </thead>
          <tbody>
            ${totals.negativas
              .map((nf) => {
                const s = getSaldoFicha(nf);
                return `<tr>
                  <td style="text-align:center;font-weight:800;color:#dc2626">${nf.ficha}</td>
                  <td><strong>${nf.orgao}</strong><div style="font-size:10px;color:#64748b">${nf.acaoDescricao || nf.especificacao}</div></td>
                  <td style="font-family:monospace;font-size:10px">${nf.fonteRecurso || '—'}</td>
                  <td class="num" style="color:#dc2626">${formatBRL(s)}</td>
                  <td class="num" style="color:#0f172a">${formatBRL(Math.abs(s))}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      `
      : '';

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Mapa Geral de Suplementação — Exercício ${exercicio}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 0; padding: 14px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
          h1 { font-size: 16px; margin: 2px 0; }
          .group-box { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 12px; page-break-inside: avoid; }
          .group-head { background: #f8fafc; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; }
          th { background: #1e293b; color: #fff; font-size: 9.5px; text-transform: uppercase; }
          .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 32px; padding: 0 24px; page-break-inside: avoid; }
          .sig { border-top: 1px solid #334155; padding-top: 6px; text-align: center; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase">${currentInstitution?.name || 'CONTABILIDADE MUNICIPAL'}</div>
            <h1>Mapa Geral de Suplementação (Origem das Retiradas → Fichas Suplementadas)</h1>
            <div>Exercício: <strong>${exercicio}</strong> &bull; Fichas Suplementadas: <strong>${groups.length}</strong> &bull; Total Remanejado: <strong>${formatBRL(totalGeralRemanejado)}</strong></div>
          </div>
          <div style="text-align:right;font-size:10px;color:#64748b">Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
        ${groupsHtml}
        ${origensConsolidadasHtml}
        ${negativasHtml}
        <div class="signatures">
          <div class="sig">Contabilidade / Responsável Técnico</div>
          <div class="sig">Conferência / Controle Interno</div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handlePrintCoberturaDraft = () => {
    if (!cobrirTargetFicha) return;
    const rawValidRows = cobrirSources
      .map((s) => ({
        ...s,
        fObj: fichas.find((f) => f.ficha === s.fichaOrigem.trim()),
        valNum: parseCurrencyInputPtBr(s.valor),
      }))
      .filter((s) => s.fObj && s.valNum > 0);

    if (rawValidRows.length === 0) {
      showToast('Selecione ao menos uma ficha de origem e valor maior que zero para imprimir.', 'warning');
      return;
    }

    // Soma fichas de origem iguais antes de imprimir
    const summedMap = new Map<string, { fObj: ContabilidadeFicha; valNum: number }>();
    for (const r of rawValidRows) {
      const f = r.fObj!;
      const prev = summedMap.get(f.ficha);
      summedMap.set(f.ficha, {
        fObj: f,
        valNum: Number(((prev?.valNum || 0) + r.valNum).toFixed(2)),
      });
    }
    const validRows = Array.from(summedMap.values());

    const win = window.open('', '_blank', 'width=1000,height=720');
    if (!win) {
      showToast('Permita pop-ups para imprimir o mapa de cobertura.', 'warning');
      return;
    }

    const saldoAntes = getSaldoFicha(cobrirTargetFicha);
    const totalRetirado = validRows.reduce((acc, r) => acc + r.valNum, 0);
    const saldoDepois = saldoAntes + totalRetirado;
    const dataBr = cobrirData ? cobrirData.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Mapa de Cobertura — Ficha ${cobrirTargetFicha.ficha}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 0; padding: 14px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
          h1 { font-size: 16px; margin: 2px 0; }
          .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; background: #f8fafc; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #1e293b; color: #fff; font-size: 10px; text-transform: uppercase; }
          .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 36px; padding: 0 24px; }
          .sig { border-top: 1px solid #334155; padding-top: 6px; text-align: center; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase">${currentInstitution?.name || 'CONTABILIDADE MUNICIPAL'}</div>
            <h1>Mapa de Cobertura de Ficha Negativa (Anulação → Suplementação)</h1>
            <div>Exercício: <strong>${exercicio}</strong> &bull; Data: <strong>${dataBr}</strong> ${cobrirDecreto ? `&bull; Decreto: <strong>${cobrirDecreto}</strong>` : ''}</div>
          </div>
          <div style="text-align:right;font-size:10px;color:#64748b">Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>

        <div class="box">
          <div style="font-size:10px;text-transform:uppercase;color:#475569;font-weight:700">Ficha Suplementada (Destino)</div>
          <div style="font-size:14px;font-weight:800;margin-top:2px">Ficha ${cobrirTargetFicha.ficha} — ${cobrirTargetFicha.acaoDescricao || cobrirTargetFicha.especificacao}</div>
          <div style="color:#475569">${cobrirTargetFicha.orgao}${cobrirTargetFicha.categoria ? ` &bull; Natureza: ${cobrirTargetFicha.categoria}${cobrirTargetFicha.especificacao ? ` (${cobrirTargetFicha.especificacao})` : ''}` : ''}${cobrirTargetFicha.fonteRecurso ? ` &bull; Fonte: ${cobrirTargetFicha.fonteRecurso}` : ''}</div>
        </div>

        <div class="grid">
          <div class="box" style="margin:0"><div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">Saldo Anterior</div><div style="font-size:14px;font-weight:800;color:#dc2626">${formatBRL(saldoAntes)}</div></div>
          <div class="box" style="margin:0"><div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">Total Suplementado</div><div style="font-size:14px;font-weight:800;color:#047857">+ ${formatBRL(totalRetirado)}</div></div>
          <div class="box" style="margin:0"><div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">Saldo Após Cobertura</div><div style="font-size:14px;font-weight:800;color:${saldoDepois < -0.001 ? '#dc2626' : '#047857'}">${formatBRL(saldoDepois)}</div></div>
          <div class="box" style="margin:0"><div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">Fichas de Origem</div><div style="font-size:14px;font-weight:800">${validRows.length} ficha(s)</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:85px;text-align:center">Ficha Origem</th>
              <th>Órgão / Ação da Ficha de Origem (Anulação)</th>
              <th style="width:130px;text-align:right">Saldo Antes</th>
              <th style="width:135px;text-align:right">Valor Retirado (-)</th>
              <th style="width:135px;text-align:right">Saldo Restante</th>
            </tr>
          </thead>
          <tbody>
            ${validRows
              .map((r) => {
                const sAntes = getSaldoFicha(r.fObj!);
                const sRest = sAntes - r.valNum;
                return `<tr>
                  <td style="text-align:center;font-weight:800">Ficha ${r.fObj!.ficha}</td>
                  <td><strong>${r.fObj!.acaoDescricao || r.fObj!.especificacao}</strong><div style="font-size:10px;color:#64748b">${r.fObj!.orgao}${r.fObj!.categoria ? ` • Natureza: ${r.fObj!.categoria}${r.fObj!.especificacao ? ` (${r.fObj!.especificacao})` : ''}` : ''}${r.fObj!.fonteRecurso ? ` • Fonte: ${r.fObj!.fonteRecurso}` : ''}</div></td>
                  <td class="num">${formatBRL(sAntes)}</td>
                  <td class="num" style="color:#be123c">- ${formatBRL(r.valNum)}</td>
                  <td class="num" style="color:${sRest < -0.001 ? '#dc2626' : '#047857'}">${formatBRL(sRest)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9">
              <td colspan="3" style="text-align:right;font-weight:800">TOTAL RETIRADO PARA SUPLEMENTAR A FICHA ${cobrirTargetFicha.ficha}:</td>
              <td class="num" style="color:#be123c">- ${formatBRL(totalRetirado)}</td>
              <td class="num">—</td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div class="sig">Contabilidade / Responsável Técnico</div>
          <div class="sig">Conferência / Controle Interno</div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleConfirmCobertura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobrirTargetFicha) return;

    const validRows = cobrirSources
      .map((s) => ({
        fichaOrigem: s.fichaOrigem.trim(),
        valor: parseCurrencyInputPtBr(s.valor),
      }))
      .filter((s) => s.fichaOrigem && s.valor > 0);

    if (validRows.length === 0) {
      showToast('Selecione ao menos uma ficha de origem e informe o valor a retirar.', 'warning');
      return;
    }

    for (const r of validRows) {
      if (r.fichaOrigem === cobrirTargetFicha.ficha) {
        showToast('A ficha de origem não pode ser igual à ficha negativa.', 'warning');
        return;
      }
      if (!fichas.some((f) => f.ficha === r.fichaOrigem)) {
        showToast(`Ficha de origem ${r.fichaOrigem} não encontrada.`, 'warning');
        return;
      }
    }

    setCobrirSaving(true);
    const nowIso = new Date().toISOString();
    const lancDateIso = cobrirData ? `${cobrirData}T12:00:00.000Z` : nowIso;
    const userLabel = currentUser?.name || 'Contabilidade';
    const docClean = cobrirDecreto.trim() || undefined;

    const updatedMap = new Map<string, ContabilidadeFicha>();
    const newLancs: ContabilidadeLancamento[] = [];
    let totalAdicionado = 0;

    for (const r of validRows) {
      const origBase = updatedMap.get(r.fichaOrigem) || fichas.find((f) => f.ficha === r.fichaOrigem)!;
      const origUpdated: ContabilidadeFicha = {
        ...origBase,
        totalDescontado: Number((origBase.totalDescontado + r.valor).toFixed(2)),
        updatedAt: nowIso,
      };
      updatedMap.set(origUpdated.ficha, origUpdated);
      totalAdicionado = Number((totalAdicionado + r.valor).toFixed(2));

      newLancs.push({
        id: crypto.randomUUID(),
        exercicio,
        ficha: origUpdated.ficha,
        tipo: 'desconto',
        valor: r.valor,
        documento: docClean,
        observacao: `Anulação p/ cobrir Ficha ${cobrirTargetFicha.ficha}`,
        fichaContrapartida: cobrirTargetFicha.ficha,
        createdBy: userLabel,
        createdAt: lancDateIso,
      });

      newLancs.push({
        id: crypto.randomUUID(),
        exercicio,
        ficha: cobrirTargetFicha.ficha,
        tipo: 'suplementacao',
        valor: r.valor,
        documento: docClean,
        observacao: `Suplementação vinda da Ficha ${origUpdated.ficha}`,
        fichaContrapartida: origUpdated.ficha,
        createdBy: userLabel,
        createdAt: lancDateIso,
      });
    }

    const destUpdated: ContabilidadeFicha = {
      ...cobrirTargetFicha,
      totalSuplementado: Number((cobrirTargetFicha.totalSuplementado + totalAdicionado).toFixed(2)),
      updatedAt: nowIso,
    };
    updatedMap.set(destUpdated.ficha, destUpdated);

    const nextFichas = fichas.map((f) => updatedMap.get(f.ficha) || f);
    const nextLanc = [...newLancs, ...lancamentos];
    setFichas(nextFichas);
    setLancamentos(nextLanc);
    persistLocal(nextFichas, nextLanc);

    try {
      setCloudStatus('syncing');
      for (const f of updatedMap.values()) {
        await runWithSupabaseFallback((client) =>
          client
            .from('fin_contabilidade_fichas')
            .update({
              total_descontado: f.totalDescontado,
              total_suplementado: f.totalSuplementado,
              updated_by: userLabel,
              updated_at: nowIso,
            })
            .eq('institution_id', instId)
            .eq('exercicio', exercicio)
            .eq('ficha', f.ficha)
        );
      }

      await runWithSupabaseFallback((client) =>
        client.from('fin_contabilidade_lancamentos').insert(
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
        )
      );
      setCloudStatus('synced');
    } catch {
      setCloudStatus('local');
    }

    setCobrirSaving(false);
    setCobrirTargetFicha(null);
    showToast(
      `Ficha ${destUpdated.ficha} suplementada com ${formatBRL(totalAdicionado)} a partir de ${validRows.length} ficha(s)!`,
      'success'
    );
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

    const dotAtual = parseCurrencyInputPtBr(newFichaForm.dotacaoAtual);
    const nowIso = new Date().toISOString();
    const nova: ContabilidadeFicha = {
      id: generateUUID(),
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

    await upsertFichasCloud([nova], exercicio, currentUser?.name || 'Contabilidade', nowIso);

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

    void downloadWorkbookXlsx(
      [{ name: `Fichas_${exercicio}`, rows }],
      `Contabilidade_Suplementacao_Fichas_${exercicio}.xlsx`
    );
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
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full ${
                    cloudStatus === 'synced'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : cloudStatus === 'syncing'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  }`}
                  title="Sincronização no banco de dados (Supabase) para acesso em todos os computadores"
                >
                  <Cloud size={11} />
                  {cloudStatus === 'synced'
                    ? 'Salvo na Nuvem'
                    : cloudStatus === 'syncing'
                    ? 'Sincronizando...'
                    : 'Apenas Local'}
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
                    <div
                      key={nf.ficha}
                      className="inline-flex items-center rounded-lg overflow-hidden shadow-sm border border-red-700"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSinalFilter('negativo');
                          setSearchTerm(nf.ficha);
                          handleSelectFichaFromRow(nf.ficha, 'suplementacao');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>Ficha {nf.ficha}: {formatBRL(getSaldoFicha(nf))}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openCobrirModal(nf)}
                        className="px-2.5 py-1 bg-white hover:bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider transition-colors"
                        title={`Escolher de quais fichas retirar saldo para suplementar a Ficha ${nf.ficha}`}
                      >
                        Suplementar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrintMapaGeralCobertura}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-colors"
                title="Imprimir de uma só vez o mapa de todas as fichas"
              >
                <Printer size={14} />
                <span>Imprimir Mapa Geral</span>
              </button>
              <button
                type="button"
                onClick={() => setSinalFilter(sinalFilter === 'negativo' ? 'todos' : 'negativo')}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-red-900/60 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 text-xs font-black uppercase tracking-wider hover:bg-red-100 transition-colors"
              >
                {sinalFilter === 'negativo' ? 'Mostrar Todas' : 'Filtrar Negativas'}
              </button>
            </div>
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
              inputMode="decimal"
              value={valorInput}
              onChange={(e) => setValorInput(formatCurrencyInputPtBr(e.target.value))}
              onBlur={() => setValorInput((prev) => finalizeCurrencyInputPtBr(prev))}
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
          <div className="w-full overflow-x-auto lg:overflow-x-visible">
            <table className="w-full min-w-[820px] lg:min-w-0 lg:table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  <th className="py-3 px-2 w-[88px]">Sinal</th>
                  <th className="py-3 px-2 w-[60px]">Ficha</th>
                  <th className="py-3 px-2">Órgão / Ação / Natureza</th>
                  <th className="py-3 px-2 w-[108px]">Fonte</th>
                  <th className="py-3 px-2 w-[100px] text-right">Empenhado</th>
                  <th className="py-3 px-2 w-[104px] text-right">Saldo PDF</th>
                  <th className="py-3 px-2 w-[96px] text-right">Descontado</th>
                  <th className="py-3 px-2 w-[100px] text-right">Suplementado</th>
                  <th className="py-3 px-2 w-[114px] text-right">Saldo Atual</th>
                  <th className="py-3 px-2 w-[96px] text-center print:hidden">Lançar</th>
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 font-black text-xs">
                          {f.ficha}
                        </span>
                        {f.cloc && <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{f.cloc}</div>}
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

                      <td className="py-2.5 px-2 whitespace-nowrap text-right font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                        {formatBRL(f.empenhado || 0)}
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

                      <td className="py-2.5 px-2 whitespace-nowrap text-right">
                        <span
                          className={`inline-flex items-center justify-end px-2 py-0.5 rounded-lg font-black text-[12px] tabular-nums ${
                            sinal === 'negativo'
                              ? 'bg-red-600 text-white shadow-sm'
                              : sinal === 'zerado' || sinal === 'critico'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {formatBRL(saldo)}
                        </span>
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintMapaGeralCobertura}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                  title="Imprimir de uma só vez todas as suplementações e fichas negativas"
                >
                  <Printer size={14} />
                  <span>Mapa Geral</span>
                </button>
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

              {consolidatedPeriodoFichas.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhum lançamento encontrado para o período selecionado.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                    <table className="w-full table-fixed text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-neutral-800 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 dark:border-neutral-700">
                          <th className="py-2.5 px-2.5 w-[74px]">Ficha</th>
                          <th className="py-2.5 px-2.5">Órgão / Ação / Origem-Destino</th>
                          <th className="py-2.5 px-2 w-[96px]">Decretos</th>
                          <th className="py-2.5 px-2 w-[50px] text-center">Mov.</th>
                          <th className="py-2.5 px-2.5 w-[106px] text-right">Descontado</th>
                          <th className="py-2.5 px-2.5 w-[110px] text-right">Suplementado</th>
                          <th className="py-2.5 px-2.5 w-[112px] text-right">Saldo Ficha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                        {consolidatedPeriodoFichas.map((item) => (
                          <tr key={item.ficha} className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/40">
                            <td className="py-2 px-2.5 font-black whitespace-nowrap align-top">Ficha {item.ficha}</td>
                            <td className="py-2 px-2.5 min-w-0">
                              <div className="font-semibold text-slate-800 dark:text-neutral-200 truncate" title={item.orgao}>
                                {item.orgao}
                              </div>
                              {item.acaoDescricao && (
                                <div className="text-[11px] text-slate-500 truncate" title={item.acaoDescricao}>
                                  {item.acaoDescricao}
                                </div>
                              )}
                              {item.origens.length > 0 && (
                                <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                                  Veio de:{' '}
                                  {item.origens
                                    .map((o) => `Ficha ${o.fichaOrigem} (${formatBRL(o.valor)})`)
                                    .join(' • ')}
                                </div>
                              )}
                              {item.destinos.length > 0 && (
                                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                                  Foi p/:{' '}
                                  {item.destinos
                                    .map((d) => `Ficha ${d.fichaDestino} (${formatBRL(d.valor)})`)
                                    .join(' • ')}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-2 truncate align-top" title={item.decretos.join(', ') || '—'}>
                              {item.decretos.length > 0 ? item.decretos.join(', ') : '—'}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-slate-500 tabular-nums align-top">
                              {item.lancamentosCount}
                            </td>
                            <td className="py-2 px-2.5 text-right font-black text-rose-600 tabular-nums whitespace-nowrap align-top">
                              {item.totalDescontado > 0 ? `- ${formatBRL(item.totalDescontado)}` : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-black text-emerald-600 tabular-nums whitespace-nowrap align-top">
                              {item.totalSuplementado > 0 ? `+ ${formatBRL(item.totalSuplementado)}` : '—'}
                            </td>
                            <td
                              className={`py-2 px-2.5 text-right font-bold tabular-nums whitespace-nowrap align-top ${
                                item.saldoAtualFicha !== null && item.saldoAtualFicha < -0.001
                                  ? 'text-red-600'
                                  : 'text-slate-700 dark:text-neutral-200'
                              }`}
                            >
                              {item.saldoAtualFicha !== null ? formatBRL(item.saldoAtualFicha) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {origemDestinoPairs.length > 0 && (
                    <div className="border border-indigo-200 dark:border-indigo-900/50 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-900/50 text-[11px] font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
                        Mapa Origem → Destino (De qual ficha foi retirado para suplementar)
                      </div>
                      <table className="w-full table-fixed text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-neutral-800 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 dark:border-neutral-700">
                            <th className="py-2 px-2.5 w-[96px]">Ficha Supl.</th>
                            <th className="py-2 px-2.5">Destino (Suplementada)</th>
                            <th className="py-2 px-2.5 w-[96px]">Ficha Origem</th>
                            <th className="py-2 px-2.5">Origem (Retirada)</th>
                            <th className="py-2 px-2.5 w-[120px] text-right">Valor Retirado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                          {origemDestinoPairs.map((p) => (
                            <tr key={`${p.fichaOrigem}-${p.fichaDestino}`}>
                              <td className="py-2 px-2.5 font-black text-emerald-700 dark:text-emerald-400">
                                Ficha {p.fichaDestino}
                              </td>
                              <td className="py-2 px-2.5 truncate" title={p.destinoDesc}>
                                {p.destinoDesc || '—'}
                              </td>
                              <td className="py-2 px-2.5 font-black text-rose-600 dark:text-rose-400">
                                Ficha {p.fichaOrigem}
                              </td>
                              <td className="py-2 px-2.5 truncate" title={p.origemDesc}>
                                {p.origemDesc || '—'}
                              </td>
                              <td className="py-2 px-2.5 text-right font-black tabular-nums">
                                {formatBRL(p.valorTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
                    inputMode="decimal"
                    required
                    value={newFichaForm.dotacaoAtual}
                    onChange={(e) =>
                      setNewFichaForm({ ...newFichaForm, dotacaoAtual: formatCurrencyInputPtBr(e.target.value) })
                    }
                    onBlur={() =>
                      setNewFichaForm((prev) => ({ ...prev, dotacaoAtual: finalizeCurrencyInputPtBr(prev.dotacaoAtual) }))
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

      {/* MODAL SUPLEMENTAR FICHA NEGATIVA (ANULAÇÃO -> SUPLEMENTAÇÃO) */}
      {cobrirTargetFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 print:hidden">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Suplementar Ficha {cobrirTargetFicha.ficha} (Escolher Fichas de Origem)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {cobrirTargetFicha.orgao} • {cobrirTargetFicha.acaoDescricao || cobrirTargetFicha.especificacao}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 max-w-full">
                    <span className="shrink-0">Fonte da Ficha:</span>
                    <span className="font-mono truncate">{cobrirTargetFicha.fonteRecurso || 'Não informada'}</span>
                  </div>
                  {(cobrirTargetFicha.acaoDescricao || cobrirTargetFicha.especificacao) && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] font-bold text-slate-700 dark:text-neutral-200 max-w-full">
                      <span className="shrink-0">Proj./Ativ.:</span>
                      <span className="truncate">{cobrirTargetFicha.acaoDescricao || cobrirTargetFicha.especificacao}</span>
                    </div>
                  )}
                  {(cobrirTargetFicha.categoria || cobrirTargetFicha.especificacao) && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-[11px] font-bold text-violet-700 dark:text-violet-300 max-w-full">
                      <span className="shrink-0">Natureza:</span>
                      <span className="font-mono truncate">
                        {[cobrirTargetFicha.categoria, cobrirTargetFicha.especificacao].filter(Boolean).join(' - ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCobrirTargetFicha(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCobertura} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {(() => {
                const saldoAntes = getSaldoFicha(cobrirTargetFicha);
                const totalRetirado = cobrirSources.reduce(
                  (acc, s) => acc + parseCurrencyInputPtBr(s.valor),
                  0
                );
                const saldoDepois = saldoAntes + totalRetirado;
                const faltaCobrir = Math.max(0, -saldoDepois);

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                        <div className="text-[10px] font-bold uppercase text-red-600">Saldo Atual da Ficha</div>
                        <div className="text-lg font-black text-red-700 dark:text-red-400 tabular-nums">
                          {formatBRL(saldoAntes)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
                        <div className="text-[10px] font-bold uppercase text-indigo-600">Total a Retirar das Origens</div>
                        <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                          + {formatBRL(totalRetirado)}
                        </div>
                      </div>
                      <div
                        className={`p-3 rounded-xl border ${
                          saldoDepois < -0.001
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-500">Novo Saldo Após Cobertura</div>
                        <div
                          className={`text-lg font-black tabular-nums ${
                            saldoDepois < -0.001 ? 'text-amber-700' : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {formatBRL(saldoDepois)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-600 dark:text-neutral-300 mb-1">
                          Nº do Decreto
                        </label>
                        <input
                          type="text"
                          value={cobrirDecreto}
                          onChange={(e) => setCobrirDecreto(e.target.value)}
                          placeholder="Ex: Dec. 015/2026"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 dark:text-neutral-300 mb-1">
                          Data da Cobertura
                        </label>
                        <input
                          type="date"
                          value={cobrirData}
                          onChange={(e) => setCobrirData(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-neutral-200">
                          Fichas de Origem (De onde será retirado o saldo)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCobrirSources((prev) => [
                              ...prev,
                              { id: crypto.randomUUID(), fichaOrigem: '', valor: '' },
                            ])
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold"
                        >
                          <Plus size={13} />
                          <span>Adicionar Ficha Origem</span>
                        </button>
                      </div>

                      {cobrirSources.map((src) => {
                        const origObj = fichas.find((f) => f.ficha === src.fichaOrigem.trim());
                        const saldoOrig = origObj ? getSaldoFicha(origObj) : null;
                        return (
                          <div
                            key={src.id}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-800/40 text-xs"
                          >
                            <div className="sm:col-span-6 min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenOriginPickerId(src.id);
                                  setOriginPickerSearch('');
                                }}
                                className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-left flex items-center justify-between gap-2 hover:border-indigo-400 transition-colors"
                              >
                                {origObj ? (
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[11px] shrink-0">
                                      Ficha {origObj.ficha}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-neutral-100 truncate text-xs">
                                      {origObj.acaoDescricao || origObj.especificacao}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-slate-500">
                                    Clique para escolher a Ficha de Origem...
                                  </span>
                                )}
                                <span className="text-[10px] text-indigo-600 font-bold shrink-0">Selecionar</span>
                              </button>
                              {origObj && (
                                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                  <div className="font-semibold text-slate-700 dark:text-neutral-200 truncate">
                                    Proj./Ativ.: {origObj.acaoDescricao || origObj.especificacao}
                                  </div>
                                  {(origObj.categoria || origObj.especificacao) && (
                                    <div className="text-[10px] font-bold text-violet-700 dark:text-violet-300 truncate">
                                      Natureza: <span className="font-mono">{[origObj.categoria, origObj.especificacao].filter(Boolean).join(' - ')}</span>
                                    </div>
                                  )}
                                  <div className="truncate flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 font-mono font-bold">
                                      Fonte: {origObj.fonteRecurso || '—'}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-bold">
                                      Empenhado: {formatBRL(origObj.empenhado || 0)}
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded font-black ${
                                        (saldoOrig || 0) < 0
                                          ? 'bg-red-600 text-white'
                                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                                      }`}
                                    >
                                      Saldo: {formatBRL(saldoOrig || 0)}
                                    </span>
                                  </div>
                                  {cobrirTargetFicha.fonteRecurso &&
                                    origObj.fonteRecurso &&
                                    origObj.fonteRecurso.split(' ')[0] !== cobrirTargetFicha.fonteRecurso.split(' ')[0] && (
                                      <div className="text-[10px] font-bold text-amber-600">
                                        Atenção: Fonte diferente da ficha destino ({cobrirTargetFicha.fonteRecurso.split(' ')[0]})
                                      </div>
                                    )}
                                </div>
                              )}
                            </div>

                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={src.valor}
                                onChange={(e) =>
                                  setCobrirSources((prev) =>
                                    prev.map((item) =>
                                      item.id === src.id
                                        ? { ...item, valor: formatCurrencyInputPtBr(e.target.value) }
                                        : item
                                    )
                                  )
                                }
                                onBlur={() =>
                                  setCobrirSources((prev) =>
                                    prev.map((item) =>
                                      item.id === src.id
                                        ? { ...item, valor: finalizeCurrencyInputPtBr(item.valor) }
                                        : item
                                    )
                                  )
                                }
                                placeholder="Valor a retirar (0,00)"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-black text-right"
                              />
                            </div>

                            <div className="sm:col-span-2 flex items-center justify-end gap-1">
                              {faltaCobrir > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentThis = parseCurrencyInputPtBr(src.valor);
                                    const sugestao = currentThis + faltaCobrir;
                                    setCobrirSources((prev) =>
                                      prev.map((item) =>
                                        item.id === src.id
                                          ? {
                                              ...item,
                                              valor: sugestao.toLocaleString('pt-BR', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              }),
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className="px-2 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-black"
                                  title="Preencher o valor restante para zerar a ficha negativa"
                                >
                                  Completar
                                </button>
                              )}
                              {cobrirSources.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCobrirSources((prev) => prev.filter((item) => item.id !== src.id))
                                  }
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                  title="Remover linha"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={handlePrintCoberturaDraft}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800"
                      >
                        <Printer size={14} />
                        <span>Imprimir Mapa desta Ficha</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCobrirTargetFicha(null)}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-xs font-bold text-slate-600"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={cobrirSaving || totalRetirado <= 0}
                          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black disabled:opacity-50"
                        >
                          {cobrirSaving ? 'Salvando...' : 'Confirmar Suplementação'}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* POPUP AMPLIADO DE SELEÇÃO DA FICHA DE ORIGEM */}
      {cobrirTargetFicha && openOriginPickerId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 print:hidden"
          onClick={() => setOpenOriginPickerId(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 max-w-4xl w-full max-h-[86vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Selecionar Ficha de Origem (Saldo Positivo)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Para suplementar a <strong>Ficha {cobrirTargetFicha.ficha}</strong> • Fonte:{' '}
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    {cobrirTargetFicha.fonteRecurso || 'Não informada'}
                  </span>
                </p>
                {(() => {
                  const saldoTarget = getSaldoFicha(cobrirTargetFicha);
                  const jaPreenchido = cobrirSources.reduce(
                    (acc, s) => acc + parseCurrencyInputPtBr(s.valor),
                    0
                  );
                  const faltaZerar = Math.max(0, -(saldoTarget + jaPreenchido));
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-black tabular-nums shadow-xs">
                        Saldo da Ficha {cobrirTargetFicha.ficha}: {formatBRL(saldoTarget)}
                      </span>
                      {faltaZerar > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black tabular-nums">
                          Falta para zerar: {formatBRL(faltaZerar)}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => setOpenOriginPickerId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/60">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={originPickerSearch}
                  onChange={(e) => setOriginPickerSearch(e.target.value)}
                  placeholder="Buscar por número da ficha, projeto/atividade, órgão ou fonte..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800">
              {(() => {
                const q = originPickerSearch.trim().toLowerCase();
                const targetPrefix = (cobrirTargetFicha.fonteRecurso || '').split(' ')[0];
                const list = fichas
                  .filter((f) => f.ficha !== cobrirTargetFicha.ficha && getSaldoFicha(f) > 0)
                  .filter((f) => {
                    if (!q) return true;
                    return (
                      f.ficha.toLowerCase().includes(q) ||
                      (f.acaoDescricao || '').toLowerCase().includes(q) ||
                      (f.categoria || '').toLowerCase().includes(q) ||
                      (f.especificacao || '').toLowerCase().includes(q) ||
                      (f.fonteRecurso || '').toLowerCase().includes(q) ||
                      (f.orgao || '').toLowerCase().includes(q)
                    );
                  })
                  .sort((a, b) => {
                    const aMatch = targetPrefix && (a.fonteRecurso || '').startsWith(targetPrefix) ? 0 : 1;
                    const bMatch = targetPrefix && (b.fonteRecurso || '').startsWith(targetPrefix) ? 0 : 1;
                    if (aMatch !== bMatch) return aMatch - bMatch;
                    return a.ficha.localeCompare(b.ficha, 'pt-BR', { numeric: true });
                  });

                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center text-sm text-slate-400">
                      Nenhuma ficha com saldo positivo encontrada para essa busca.
                    </div>
                  );
                }

                return list.map((f) => {
                  const isSameFonte = Boolean(targetPrefix && (f.fonteRecurso || '').startsWith(targetPrefix));
                  const saldoF = getSaldoFicha(f);
                  return (
                    <button
                      key={f.ficha}
                      type="button"
                      onClick={() => {
                        setCobrirSources((prev) =>
                          prev.map((item) =>
                            item.id === openOriginPickerId ? { ...item, fichaOrigem: f.ficha } : item
                          )
                        );
                        setOpenOriginPickerId(null);
                      }}
                      className="w-full px-4 sm:px-5 py-3 text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSameFonte && (
                            <span className="text-amber-500 font-black text-sm" title="Mesma Fonte">
                              ★
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-xs shrink-0">
                            Ficha {f.ficha}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {f.acaoDescricao || f.especificacao}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="text-slate-500 dark:text-neutral-400">{f.orgao}</span>
                          {(f.categoria || f.especificacao) && (
                            <span className="font-mono font-bold text-violet-700 dark:text-violet-300">
                              Natureza: {[f.categoria, f.especificacao].filter(Boolean).join(' - ')}
                            </span>
                          )}
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                            Fonte: {f.fonteRecurso || '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-bold text-xs tabular-nums">
                          Emp.: {formatBRL(f.empenhado || 0)}
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 font-black text-sm tabular-nums">
                          {formatBRL(saldoF)}
                        </span>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
