/**
-- ====================================================================
-- SERVIÇO DE AUDITORIA MATEMÁTICA E VALIDAÇÃO EM DUAS VIAS DE FROTAS
-- Arquivo: src/lib/api/fleetFuelAudit.ts
-- Gestão 360 - Módulo de Frotas / Controles Internos
-- Regras de Auditoria Matemática, Matriz de Risco e Preços Licitados
-- ====================================================================
*/

import { supabase, supabaseAnon } from '../supabase';
import { acquireOrderIssuanceLock, buildOrderIssuanceKey, isDuplicateFuelOrderCollision, releaseOrderIssuanceLock } from './fleetOrderIssuanceGuard';
import { calculateRealtimeMetrics, parseExcelDate } from './fleetFuelRulesCore';

export { calculateRealtimeMetrics, parseExcelDate };
import { compressImageFile, uploadOptimizedImageToStorage } from '../imageUpload';
import { downloadWorkbookXlsx } from '../../utils/spreadsheet';
import { FleetVehicle, FuelType, MetricType, FleetBudgetClassification, getLocalBudgetClassifications, getNextFuelOrderSequence, getNextOrderNumber7Digits, formatOrderNumber7Digits, ensureDriverExistsInSupabase, toBudgetUUID, isValidUUID, saveFuelOrderBudgetToSupabase } from './fleetFuel'; import { bestEffort, reportError } from '../logger';

export type AnomalyLevel = 'none' | 'alerta_amarelo' | 'bloqueio_critico';
export type TwoWayOrderStatus = 'autorizado_pendente' | 'aguardando_abastecimento' | 'abastecido' | 'auditado' | 'glosado' | 'cancelado';

/**
 * Tabela Referencial Padrão de Preços Licitados Contratuais Homologados
 * (Registro de Preços Ata 042/2026 - Valores de Base)
 */
export interface BiddedFuelPriceItem {
  price: number;
  name: string;
  contractNumber?: string;
  lastRebalanceDate?: string;
  rebalanceReason?: string;
}

export type BiddedPricesMap = Record<FuelType, BiddedFuelPriceItem>;

export const DEFAULT_BIDDED_PRICES: BiddedPricesMap = {
  gasolina: { price: 6.290, name: 'Gasolina Comum', contractNumber: 'ATA-RP 042/2026 - Lote 01' },
  etanol: { price: 4.350, name: 'Etanol Hidratado', contractNumber: 'ATA-RP 042/2026 - Lote 02' },
  diesel_s10: { price: 6.190, name: 'Diesel S-10 Especial', contractNumber: 'ATA-RP 042/2026 - Lote 03' },
  diesel_s500: { price: 5.980, name: 'Diesel S-500 Comum', contractNumber: 'ATA-RP 042/2026 - Lote 04' },
  arla32: { price: 4.100, name: 'Arla 32 Redutor de Emissões', contractNumber: 'ATA-RP 042/2026 - Lote 05' },
};

export const CONTRACTUAL_BIDDED_PRICES = DEFAULT_BIDDED_PRICES;

const getPricesStorageKey = (institutionId?: string) =>
  `@gestao360:fuel_bidded_prices_${institutionId || 'default'}`;

/**
 * Consulta a tabela vigente de preços licitados com carregamento remoto do Supabase
 */
export async function getBiddedFuelPricesFromSupabase(institutionId: string = 'inst_1'): Promise<BiddedPricesMap> {
  try {
    const targetInst = institutionId || 'inst_1';
    let { data, error } = await supabase
      .from('institutions')
      .select('notes')
      .eq('id', targetInst)
      .maybeSingle();

    if (error) {
      const anonRes = await supabaseAnon
        .from('institutions')
        .select('notes')
        .eq('id', targetInst)
        .maybeSingle();
      data = anonRes.data;
      error = anonRes.error;
    }

    if (!error && data?.notes) {
      try {
        const parsedNotes = JSON.parse(data.notes);
        if (parsedNotes?.fuel_bidded_prices) {
          const remotePrices = { ...DEFAULT_BIDDED_PRICES, ...parsedNotes.fuel_bidded_prices };
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(getPricesStorageKey(targetInst), JSON.stringify(remotePrices)); } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
          }
          return remotePrices;
        }
      } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
    }
  } catch (err) {
    console.warn('[FleetFuelAudit] Aviso ao carregar precos licitados do Supabase:', err);
  }

  // Fallback para cache local ou defaults
  return getBiddedFuelPrices(institutionId);
}

/**
 * Consulta síncrona da tabela vigente de preços licitados (cache local ou defaults)
 */
export function getBiddedFuelPrices(institutionId?: string): BiddedPricesMap {
  try {
    const raw = localStorage.getItem(getPricesStorageKey(institutionId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_BIDDED_PRICES, ...parsed };
    }
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
  return DEFAULT_BIDDED_PRICES;
}

/**
 * Salva e aplica nova tabela de preços licitados após pedido de reequilíbrio econômico-financeiro
 * Persiste no Supabase (institutions.notes) para ficar disponível em todos os computadores e celulares.
 */
export async function saveBiddedFuelPrices(
  newPrices: BiddedPricesMap,
  institutionId: string = 'inst_1',
  rebalanceReason?: string,
  contractTerm?: string
): Promise<BiddedPricesMap> {
  const updatedPrices: BiddedPricesMap = { ...newPrices };
  const todayIso = new Date().toISOString();
  const targetInst = institutionId || 'inst_1';

  // Marca data e motivo do reequilíbrio se fornecido
  (Object.keys(updatedPrices) as FuelType[]).forEach((fuel) => {
    if (rebalanceReason || contractTerm) {
      updatedPrices[fuel] = {
        ...updatedPrices[fuel],
        lastRebalanceDate: todayIso,
        rebalanceReason: rebalanceReason || updatedPrices[fuel].rebalanceReason,
        contractNumber: contractTerm || updatedPrices[fuel].contractNumber
      };
    }
  });

  try {
    localStorage.setItem(getPricesStorageKey(targetInst), JSON.stringify(updatedPrices));
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }

  // Sincroniza diretamente com a tabela institutions.notes no Supabase (Fonte Única da Verdade)
  try {
    let currentNotesObj: Record<string, any> = {};
    const { data: instData } = await supabase.from('institutions').select('notes').eq('id', targetInst).maybeSingle();
    if (instData?.notes) {
      try { currentNotesObj = JSON.parse(instData.notes); } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
    }
    currentNotesObj.fuel_bidded_prices = updatedPrices;

    let { error } = await supabase.from('institutions').update({
      notes: JSON.stringify(currentNotesObj)
    }).eq('id', targetInst);

    if (error) {
      await supabaseAnon.from('institutions').update({
        notes: JSON.stringify(currentNotesObj)
      }).eq('id', targetInst);
    }
  } catch (err) {
    console.warn('[FleetFuelAudit] Aviso ao sincronizar precos licitados no Supabase:', err);
  }

  return updatedPrices;
}

export interface TwoWayFuelOrder {
  id: string;
  institution_id: string;
  order_number: string; // "AUT-2026-XXXX"
  target_type?: 'veiculo' | 'galao';
  galao_label?: string;
  vehicle_id: string;
  vehicle?: FleetVehicle;
  driver_name: string;
  driver_document?: string;
  station_name: string;
  fuel_type: FuelType;
  bidded_unit_price: number; // Preço unitário fixo da licitação
  unit_price?: number;
  liters_authorized: number;
  total_authorized_value: number; // liters_authorized * bidded_unit_price
  total_value?: number;
  liters_supplied?: number;
  previous_odometer: number;
  current_odometer?: number;
  calculated_km_per_liter?: number;
  deviation_percent?: number;
  receipt_photo_url?: string;
  receipt_attachment_url?: string;
  odometer_photo_url?: string;
  pump_photo_url?: string; // Foto do visor da bomba de combustível
  invoice_coupon_number?: string;
  anomaly_level: AnomalyLevel;
  anomaly_reason?: string;
  audit_justification?: string;
  supply_mode: 'litragem_fixa' | 'encher_tanque' | 'canhoto_legado' | 'adiantamento_viagem';
  is_full_tank_order?: boolean;
  emergency_call_reason?: string;
  is_legacy_voucher?: boolean;
  voucher_number?: string;
  notes?: string;
  authorized_by_name: string;
  authorized_by_role: string;
  budget_classification_id?: string;
  budget_classification?: FleetBudgetClassification;
  status: TwoWayOrderStatus;
  created_at: string;
  supplied_at?: string;
}

export interface LegacyVoucherPayload {
  institution_id?: string;
  vehicle_id?: string;
  plate?: string;
  driver_name: string;
  driver_document?: string;
  station_name: string;
  fuel_type?: FuelType;
  voucher_number?: string; // Ex: "Canhoto 0412", "Talão 108"
  custom_order_number?: string; // Número personalizado da autorização (ex: "0412" ou "AUT-2026-0412")
  supplied_at: string; // Data e hora em que o abastecimento ocorreu no passado
  liters_supplied: number;
  unit_price: number;
  odometer_reading: number; // KM / Horímetro anotado no papel
  receipt_photo_url?: string; // Foto opcional do canhoto físico
  notes?: string;
  budget_classification_id?: string;
}

export interface IssueOrderPayload {
  vehicle_id?: string;
  target_type?: 'veiculo' | 'galao';
  galao_label?: string;
  fuel_type?: FuelType;
  driver_name: string;
  driver_document?: string;
  station_name: string;
  bidded_unit_price: number;
  liters_authorized: number;
  current_odometer?: number;
  supply_mode?: 'litragem_fixa' | 'encher_tanque';
  is_full_tank_order?: boolean;
  emergency_call_reason?: string;
  pump_photo_url?: string;
  authorized_by_name?: string;
  authorized_by_role?: string;
  budget_classification_id?: string;
  budget_classification?: FleetBudgetClassification;
  institution_id?: string;
  custom_order_number?: string; // Número personalizado para seguir requisições em papel
  ignore_fraud_risk?: boolean;
  fraud_risk_justification?: string;
}

export interface OrderCompletionPayload {
  current_odometer: number;
  liters_supplied?: number;
  fuel_type?: FuelType;
  unit_price?: number;
  total_value?: number;
  receipt_photo_url?: string;
  receipt_attachment_url?: string;
  odometer_photo_url?: string;
  pump_photo_url?: string;
  invoice_coupon_number?: string;
  audit_justification?: string;
  supplied_at?: string;
  driver_name?: string;
  vehicle_plate?: string;
  custom_order_number?: string; // Permite alterar o número da autorização ao corrigir
  order_number?: string;
  budget_classification_id?: string; // Permite alterar ou definir a Ficha Orçamentária
  budget_classification?: FleetBudgetClassification;
  allowAuditedEdit?: boolean; // Permite forçar edição mesmo se homologada
  actor_name?: string;
  actor_role?: string;
  is_system_edit?: boolean;
  ignore_fraud_risk?: boolean;
  fraud_risk_justification?: string;
}

export type FleetFuelAuditActionType =
  | 'EDICAO_ABASTECIMENTO'
  | 'ALTERACAO_DATA'
  | 'ALTERACAO_COMBUSTIVEL'
  | 'ALTERACAO_DOTACAO'
  | 'EMISSAO_ORDEM'
  | 'HOMOLOGACAO_TCE'
  | 'REABERTURA_ORDEM'
  | 'GLOSA_ORDEM'
  | 'RETIRADA_RISCO_FRAUDE'
  | 'VINCULO_NOTA_FISCAL'
  | 'EXCLUSAO_ORDEM';

export interface FleetFuelAuditFieldChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export interface FleetFuelAuditLog {
  id: string;
  institution_id: string;
  order_id?: string;
  order_number: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  action_type: FleetFuelAuditActionType;
  action_label: string;
  actor_name: string;
  actor_role?: string;
  fueling_date?: string;
  changes: FleetFuelAuditFieldChange[];
  notes?: string;
  created_at: string;
}

const getAuditLogsStorageKey = (institutionId?: string) =>
  `@gestao360:fleet_fuel_audit_logs_${institutionId || 'inst_1'}`;

/**
 * Extrai YYYY-MM-DD sem deslocamento de fuso horário (evita voltar 1 dia no UTC-3)
 */
export function extractOrderDateYYYYMMDD(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}T12:00:00/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    return trimmed.slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateBRFromRaw(raw?: string | null): string {
  const ymd = extractOrderDateYYYYMMDD(raw);
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '-';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

export function getFleetFuelAuditLogs(institutionId: string = 'inst_1'): FleetFuelAuditLog[] {
  try {
    const raw = localStorage.getItem(getAuditLogsStorageKey(institutionId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
  return [];
}

function saveLocalFleetFuelAuditLogs(logs: FleetFuelAuditLog[], institutionId: string = 'inst_1') {
  try {
    localStorage.setItem(getAuditLogsStorageKey(institutionId), JSON.stringify(logs.slice(0, 500)));
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
}

export async function getFleetFuelAuditLogsFromSupabase(institutionId: string = 'inst_1'): Promise<FleetFuelAuditLog[]> {
  const targetInst = institutionId || 'inst_1';
  const localLogs = getFleetFuelAuditLogs(targetInst);
  const mergedMap = new Map<string, FleetFuelAuditLog>();
  localLogs.forEach(l => mergedMap.set(l.id, l));

  // 1. Tenta buscar da tabela dedicada fuel_supply_audit_logs
  try {
    let { data, error } = await supabase
      .from('fuel_supply_audit_logs')
      .select('*')
      .or(`institution_id.eq.${targetInst},institution_id.eq.inst_1`)
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      const anonRes = await supabaseAnon
        .from('fuel_supply_audit_logs')
        .select('*')
        .or(`institution_id.eq.${targetInst},institution_id.eq.inst_1`)
        .order('created_at', { ascending: false })
        .limit(300);
      data = anonRes.data;
      error = anonRes.error;
    }

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        mergedMap.set(row.id, {
          id: row.id,
          institution_id: row.institution_id || targetInst,
          order_id: row.order_id || undefined,
          order_number: row.order_number || '-',
          vehicle_plate: row.vehicle_plate || undefined,
          vehicle_model: row.vehicle_model || undefined,
          action_type: row.action_type as FleetFuelAuditActionType,
          action_label: row.action_label || row.action_type,
          actor_name: row.actor_name || 'Gestor da Frota',
          actor_role: row.actor_role || undefined,
          fueling_date: row.fueling_date || undefined,
          changes: Array.isArray(row.changes) ? row.changes : [],
          notes: row.notes || undefined,
          created_at: row.created_at || new Date().toISOString()
        });
      }
    }
  } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }

  // 2. Fallback sincronizado via institutions.notes (fuel_audit_logs)
  try {
    let { data: instData, error: instErr } = await supabase
      .from('institutions')
      .select('notes')
      .eq('id', targetInst)
      .maybeSingle();

    if (instErr || !instData) {
      const anonInst = await supabaseAnon
        .from('institutions')
        .select('notes')
        .eq('id', targetInst)
        .maybeSingle();
      instData = anonInst.data;
    }

    if (instData?.notes) {
      try {
        const parsedNotes = JSON.parse(instData.notes);
        if (Array.isArray(parsedNotes?.fuel_audit_logs)) {
          for (const item of parsedNotes.fuel_audit_logs) {
            if (item?.id && !mergedMap.has(item.id)) {
              mergedMap.set(item.id, item);
            }
          }
        }
      } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
    }
  } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }

  const sorted = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  saveLocalFleetFuelAuditLogs(sorted, targetInst);
  return sorted;
}

export async function recordFleetFuelAuditLog(
  entry: Omit<FleetFuelAuditLog, 'id' | 'created_at'> & { id?: string; created_at?: string }
): Promise<FleetFuelAuditLog> {
  const targetInst = entry.institution_id || 'inst_1';
  const newLog: FleetFuelAuditLog = {
    ...entry,
    id: entry.id || generateUUID(),
    institution_id: targetInst,
    created_at: entry.created_at || new Date().toISOString()
  };

  const currentLogs = getFleetFuelAuditLogs(targetInst);
  const updatedLogs = [newLog, ...currentLogs.filter(l => l.id !== newLog.id)].slice(0, 500);
  saveLocalFleetFuelAuditLogs(updatedLogs, targetInst);

  // 1. Tenta persistir na tabela dedicada fuel_supply_audit_logs
  try {
    const dbRow = {
      id: newLog.id,
      institution_id: newLog.institution_id,
      order_id: newLog.order_id || null,
      order_number: newLog.order_number,
      vehicle_plate: newLog.vehicle_plate || null,
      vehicle_model: newLog.vehicle_model || null,
      action_type: newLog.action_type,
      action_label: newLog.action_label,
      actor_name: newLog.actor_name,
      actor_role: newLog.actor_role || null,
      fueling_date: newLog.fueling_date || null,
      changes: newLog.changes,
      notes: newLog.notes || null,
      created_at: newLog.created_at
    };
    const { error } = await supabase.from('fuel_supply_audit_logs').insert([dbRow]);
    if (error) {
      await supabaseAnon.from('fuel_supply_audit_logs').insert([dbRow]);
    }
  } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }

  // 2. Sincroniza também os últimos 200 logs em institutions.notes para resiliência universal
  try {
    let currentNotesObj: Record<string, any> = {};
    const { data: instData } = await supabase.from('institutions').select('notes').eq('id', targetInst).maybeSingle();
    if (instData?.notes) {
      try { currentNotesObj = JSON.parse(instData.notes); } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
    }
    const existingRemoteLogs = Array.isArray(currentNotesObj.fuel_audit_logs) ? currentNotesObj.fuel_audit_logs : [];
    currentNotesObj.fuel_audit_logs = [newLog, ...existingRemoteLogs.filter((l: any) => l?.id !== newLog.id)].slice(0, 200);

    const { error } = await supabase.from('institutions').update({
      notes: JSON.stringify(currentNotesObj)
    }).eq('id', targetInst);

    if (error) {
      await supabaseAnon.from('institutions').update({
        notes: JSON.stringify(currentNotesObj)
      }).eq('id', targetInst);
    }
  } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }

  return newLog;
}

export interface ConsumptionAuditCalculation {
  delta_km: number;
  effective_liters: number;
  calculated_km_per_liter: number;
  expected_consumption: number;
  deviation_percent: number;
  anomaly_level: AnomalyLevel;
  anomaly_reason?: string;
  is_blocked: boolean;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_KEY_ORDERS = 'gestao360_real_orders';
const STORAGE_KEY_VEHICLES = 'gestao360_real_vehicles';
const BUCKET_NAME = 'fleet-fuel-receipts';

/**
 * Lê ordens locais do cache seguro
 */
function getLocalOrders(): TwoWayFuelOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (raw) return JSON.parse(raw);
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
  return [];
}

/**
 * Salva ordens locais
 */
function saveLocalOrders(orders: TwoWayFuelOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
}

/**
 * Lê veículos locais
 */
function getLocalVehicles(): FleetVehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VEHICLES);
    if (raw) return JSON.parse(raw);
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
  return [];
}

function saveLocalVehicles(vehicles: FleetVehicle[]) {
  try {
    localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
}

/**
 * 1. issueFuelAuthorization: Emite autorização prévia e gera a Via do Sistema travada
 */
export async function issueFuelAuthorization(payload: IssueOrderPayload): Promise<TwoWayFuelOrder> {
  const isGalao = payload.target_type === 'galao';

  // 1. Localizar veículo (ou montar referência virtual quando for Abastecimento de Galão)
  let vehicle: FleetVehicle | undefined;
  if (!isGalao) {
    let vehicles = getLocalVehicles();
    vehicle = vehicles.find(v => v.id === payload.vehicle_id);

    if (!vehicle && payload.vehicle_id) {
      // Tenta carregar do Supabase
      try {
        const { data } = await supabase.from('fleet_vehicles').select('*').eq('id', payload.vehicle_id).single();
        if (data) {
          vehicle = data as FleetVehicle;
        }
      } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }
    }

    if (!vehicle) {
      throw new Error('Veículo informado não foi localizado no cadastro oficial da frota municipal.');
    }
  } else {
    const resolvedFuel: FuelType = payload.fuel_type || 'gasolina';
    vehicle = {
      id: '',
      institution_id: payload.institution_id || 'inst_1',
      plate: 'GALÃO',
      model: payload.galao_label?.trim() || 'Galão / Bombona de Combustível',
      department: payload.budget_classification?.department_local || 'Frota Municipal',
      fuel_type: resolvedFuel,
      tank_capacity: Math.max(Number(payload.liters_authorized || 20), 200),
      metric_type: 'km',
      expected_consumption: 0,
      current_odometer: 0,
      status: 'ativo',
      created_at: new Date().toISOString()
    };
  }

  // 2. Validações de Negócio
  if (payload.liters_authorized <= 0) {
    throw new Error('A litragem autorizada deve ser superior a zero.');
  }

  if (!isGalao && vehicle.tank_capacity > 0 && payload.liters_authorized > vehicle.tank_capacity && !payload.ignore_fraud_risk) {
    throw new Error(
      `BLOQUEIO DE AUDITORIA: Litragem autorizada (${payload.liters_authorized.toFixed(2)}L) ultrapassa a capacidade máxima do tanque (${vehicle.tank_capacity.toFixed(2)}L - ${vehicle.model}).`
    );
  }

  if (payload.bidded_unit_price <= 0) {
    throw new Error('O preço licitado unitário deve ser válido.');
  }

  // 3. Modo de Fornecimento & Cálculos travados
  const rawBudgetId = payload.budget_classification_id || vehicle.budget_classification_id;
  const localBudgets = getLocalBudgetClassifications();
  const resolvedBudget: FleetBudgetClassification | undefined = payload.budget_classification ||
    localBudgets.find(b => b.id === rawBudgetId || b.invoice_sheet === rawBudgetId || b.id === toBudgetUUID(String(rawBudgetId))) ||
    vehicle.budget_classification;
  const resolvedBudgetId = resolvedBudget?.id || (rawBudgetId ? toBudgetUUID(rawBudgetId) : undefined);

  const supply_mode = isGalao
    ? 'litragem_fixa'
    : (payload.supply_mode || (vehicle.always_full_tank ? 'encher_tanque' : 'litragem_fixa'));
  const liters_authorized = supply_mode === 'encher_tanque' && vehicle.tank_capacity > 0
    ? vehicle.tank_capacity
    : payload.liters_authorized;

  const total_authorized_value = Number((liters_authorized * payload.bidded_unit_price).toFixed(2));
  const previous_odometer = isGalao ? 0 : Number(vehicle.current_odometer || 0);
  const current_odometer = isGalao
    ? 0
    : (payload.current_odometer && Number(payload.current_odometer) > 0
      ? Number(payload.current_odometer)
      : previous_odometer);

  const delta_km = !isGalao && current_odometer > previous_odometer ? current_odometer - previous_odometer : 0;

  // 4. Sequencial oficial padrão de 7 dígitos ou número personalizado normalizado
  let orderNumber = payload.custom_order_number?.trim();
  if (orderNumber) {
    orderNumber = formatOrderNumber7Digits(orderNumber);
  } else {
    orderNumber = await getNextOrderNumber7Digits();
  }

  const newOrder: TwoWayFuelOrder = {
    id: generateUUID(),
    institution_id: payload.institution_id || vehicle.institution_id || 'inst_1',
    order_number: orderNumber,
    vehicle_id: isGalao ? '' : vehicle.id,
    vehicle: vehicle,
    driver_name: payload.driver_name.trim(),
    driver_document: payload.driver_document?.trim() || undefined,
    station_name: payload.station_name.trim(),
    fuel_type: vehicle.fuel_type,
    bidded_unit_price: payload.bidded_unit_price,
    liters_authorized: liters_authorized,
    total_authorized_value: total_authorized_value,
    previous_odometer: previous_odometer,
    current_odometer: current_odometer,
    calculated_km_per_liter: delta_km > 0 && liters_authorized > 0
      ? Number((delta_km / liters_authorized).toFixed(2))
      : undefined,
    deviation_percent: undefined,
    anomaly_level: 'none',
    audit_justification: payload.ignore_fraud_risk && payload.fraud_risk_justification?.trim()
      ? `[Risco de Fraude ignorado na emissão por ${payload.authorized_by_name || 'Gestor de Frotas'}]: ${payload.fraud_risk_justification.trim()}`
      : undefined,
    supply_mode: supply_mode,
    is_full_tank_order: !isGalao && (!!payload.is_full_tank_order || supply_mode === 'encher_tanque'),
    emergency_call_reason: payload.emergency_call_reason,
    pump_photo_url: payload.pump_photo_url || undefined,
    notes: isGalao
      ? `[Abastecimento de Galão] ${payload.galao_label?.trim() || 'Galão / Bombona de Combustível'}`
      : undefined,
    authorized_by_name: payload.authorized_by_name || 'Gestor de Frotas',
    authorized_by_role: payload.authorized_by_role || 'Gestor de Frotas',
    budget_classification_id: resolvedBudgetId,
    budget_classification: resolvedBudget,
    status: 'autorizado_pendente',
    created_at: new Date().toISOString()
  };

  // 5. Garantir que o veículo exista no Supabase antes da ordem (evita erro de foreign key)
  if (!isGalao) {
    try {
      await supabase.from('fleet_vehicles').upsert([{
        id: vehicle.id,
        institution_id: vehicle.institution_id || 'inst_1',
        plate: vehicle.plate,
        prefix_code: vehicle.prefix_code,
        model: vehicle.model,
        department: vehicle.department,
        fuel_type: vehicle.fuel_type,
        tank_capacity: vehicle.tank_capacity,
        metric_type: vehicle.metric_type,
        expected_consumption: vehicle.expected_consumption,
        current_odometer: vehicle.current_odometer,
        status: vehicle.status || 'ativo'
      }], { onConflict: 'id' });
    } catch (errVeh) {
      console.warn('[FleetFuelAudit] Aviso ao sincronizar veículo com Supabase:', errVeh);
    }
  }

  // 6. Persistir no Supabase de forma resiliente (com trava anti-duplicação)
  const issuanceLockKey = buildOrderIssuanceKey({
    institutionId: newOrder.institution_id,
    targetKey: isGalao ? (payload.galao_label || 'galao') : newOrder.vehicle_id,
    currentOdometer: newOrder.current_odometer,
    litersAuthorized: newOrder.liters_authorized
  });
  if (!acquireOrderIssuanceLock(issuanceLockKey)) {
    throw new Error('Emissão já em andamento para este veículo. Aguarde a conclusão.');
  }

  const orderRecord: Record<string, unknown> = {
    id: newOrder.id,
    institution_id: newOrder.institution_id,
    order_number: newOrder.order_number,
    vehicle_id: isGalao ? null : newOrder.vehicle_id,
    target_type: isGalao ? 'galao' : 'veiculo',
    galao_label: isGalao ? (payload.galao_label?.trim() || 'Galão / Bombona') : null,
    driver_name: newOrder.driver_name,
    driver_document: newOrder.driver_document,
    station_name: newOrder.station_name,
    fuel_type: newOrder.fuel_type,
    bidded_unit_price: newOrder.bidded_unit_price,
    liters_authorized: newOrder.liters_authorized,
    total_authorized_value: newOrder.total_authorized_value,
    previous_odometer: newOrder.previous_odometer,
    current_odometer: newOrder.current_odometer,
    calculated_km_per_liter: newOrder.calculated_km_per_liter,
    anomaly_level: 'none',
    supply_mode: newOrder.supply_mode,
    pump_photo_url: newOrder.pump_photo_url,
    authorized_by_name: newOrder.authorized_by_name,
    authorized_by_role: newOrder.authorized_by_role,
    status: 'autorizado_pendente',
    created_at: newOrder.created_at
  };

  if (resolvedBudgetId && isValidUUID(resolvedBudgetId)) {
    orderRecord.budget_classification_id = resolvedBudgetId;
  }

  try {
    let { data, error } = await supabase.from('fuel_supply_orders').insert([orderRecord]).select().single();

    for (let attempt = 0; attempt < 4 && error; attempt++) {
      const errMsg = error.message || '';
      const errCode = error.code || '';

      if (errCode === 'PGRST204' || errCode === '42703') {
        let stripped = false;
        if ('budget_classification_id' in orderRecord && errMsg.includes('budget_classification_id')) {
          delete orderRecord.budget_classification_id;
          stripped = true;
        }
        if (('target_type' in orderRecord || 'galao_label' in orderRecord) && (errMsg.includes('target_type') || errMsg.includes('galao_label'))) {
          delete orderRecord.target_type;
          delete orderRecord.galao_label;
          if (isGalao) orderRecord.emergency_call_reason = `[GALÃO] ${payload.galao_label?.trim() || 'Galão / Bombona de Combustível'}`;
          stripped = true;
        }
        if (!stripped) {
          delete orderRecord.budget_classification_id;
          delete orderRecord.target_type;
          delete orderRecord.galao_label;
        }
        const retry = await supabase.from('fuel_supply_orders').insert([orderRecord]).select().single();
        data = retry.data;
        error = retry.error;
        continue;
      }

      if (isGalao && (errCode === '23502' || errMsg.includes('vehicle_id'))) {
        const { data: existingGalao } = await supabase
          .from('fleet_vehicles').select('id').eq('plate', 'GALÃO').eq('institution_id', newOrder.institution_id).limit(1).maybeSingle();
        let galaoVehId: string | null = existingGalao?.id || null;
        if (!galaoVehId) {
          const virtualId = generateUUID();
          const { data: createdGalao } = await supabase
            .from('fleet_vehicles')
            .insert([{
              id: virtualId, institution_id: newOrder.institution_id, plate: 'GALÃO', model: 'Galão / Bombona (Avulso)',
              department: resolvedBudget?.department_local || 'Frota Municipal', fuel_type: vehicle.fuel_type,
              tank_capacity: 200, metric_type: 'km', expected_consumption: 0, current_odometer: 0, status: 'inativo'
            }])
            .select('id').single();
          galaoVehId = createdGalao?.id || virtualId;
        }
        if (galaoVehId) {
          orderRecord.vehicle_id = galaoVehId;
          newOrder.vehicle_id = galaoVehId;
          if (!orderRecord.emergency_call_reason) {
            orderRecord.emergency_call_reason = `[GALÃO] ${payload.galao_label?.trim() || 'Galão / Bombona de Combustível'}`;
          }
          const retryVeh = await supabase.from('fuel_supply_orders').insert([orderRecord]).select().single();
          data = retryVeh.data;
          error = retryVeh.error;
          continue;
        }
      }

      if (errCode === '23505') {
        const { data: existingRow } = await supabase
          .from('fuel_supply_orders')
          .select('id, order_number, vehicle_id, galao_label, current_odometer, liters_authorized, created_at')
          .eq('order_number', String(orderRecord.order_number))
          .maybeSingle();
        if (isDuplicateFuelOrderCollision(existingRow, {
          vehicleId: isGalao ? null : newOrder.vehicle_id,
          galaoLabel: isGalao ? (payload.galao_label?.trim() || 'Galão / Bombona') : null,
          currentOdometer: newOrder.current_odometer,
          litersAuthorized: newOrder.liters_authorized
        })) {
          throw new Error(`Supabase: A requisição ${String(orderRecord.order_number)} já foi emitida para este veículo e odômetro.`);
        }
        const freshNumber = await getNextOrderNumber7Digits();
        newOrder.order_number = freshNumber;
        orderRecord.order_number = freshNumber;
        const retryDup = await supabase.from('fuel_supply_orders').insert([orderRecord]).select().single();
        data = retryDup.data;
        error = retryDup.error;
        continue;
      }

      break;
    }

    if (!error && data) {
      newOrder.id = data.id;
    } else if (error) {
      console.error('[FleetFuelAudit] Erro ao gravar ordem no Supabase:', error);
      throw new Error(`Falha ao gravar autorização na nuvem Supabase: ${error.message || 'Verifique a conexão de rede.'}`);
    }
  } catch (err: unknown) {
    console.error('[FleetFuelAudit] Exceção ao gravar ordem no Supabase:', err);
    if (err instanceof Error && err.message.includes('Supabase:')) {
      throw err;
    }
    throw new Error(`Erro de comunicação com o Supabase ao emitir ordem: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    releaseOrderIssuanceLock(issuanceLockKey);
  }

  // 6.1 Garante que o condutor informado seja cadastrado automaticamente no Supabase (fleet_drivers)
  if (newOrder.driver_name) {
    try {
      await ensureDriverExistsInSupabase({
        full_name: newOrder.driver_name,
        cpf: newOrder.driver_document,
        department: vehicle.department,
        institution_id: newOrder.institution_id
      });
    } catch (errDrv) {
      console.warn('[FleetFuelAudit] Aviso ao auto-salvar motorista da ordem:', errDrv);
    }
  }

  // Se o odômetro digitado manualmente for superior ao anterior, atualiza o veículo
  if (!isGalao && current_odometer > previous_odometer) {
    try {
      await supabase
        .from('fleet_vehicles')
        .update({ current_odometer: current_odometer })
        .eq('id', vehicle.id);
    } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }

    const localVehicles = getLocalVehicles();
    const vIdx = localVehicles.findIndex(v => v.id === vehicle.id);
    if (vIdx !== -1) {
      localVehicles[vIdx].current_odometer = current_odometer;
      saveLocalVehicles(localVehicles);
    }
  }

  // 6. Atualizar cache local
  const currentOrders = getLocalOrders();
  currentOrders.unshift(newOrder);
  saveLocalOrders(currentOrders);

  return newOrder;
}

/**
 * 2. validateAndCompleteFuelOrder: Baixa digital via frentista/fiscal com auditoria matemática
 */
export async function validateAndCompleteFuelOrder(
  orderId: string,
  completionData: OrderCompletionPayload
): Promise<{ order: TwoWayFuelOrder; audit: ConsumptionAuditCalculation }> {
  // 1. Buscar a ordem
  const orders = getLocalOrders();
  let orderIndex = orders.findIndex(o => o.id === orderId || o.order_number === orderId);

  let order: TwoWayFuelOrder | null = orderIndex >= 0 ? orders[orderIndex] : null;

  if (!order) {
    try {
      const { data: rpcOrder, error: rpcErr } = await supabaseAnon.rpc('public_get_fuel_order_by_number', {
        p_identifier: orderId
      });

      let data: any = !rpcErr && rpcOrder ? rpcOrder : null;

      if (!data) {
        const authRes = await supabase
          .from('fuel_supply_orders')
          .select('*, vehicle:fleet_vehicles(*)')
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .maybeSingle();
        if (!authRes.error && authRes.data) {
          data = authRes.data;
        }
      }

      if (!data) {
        const anonRes = await supabaseAnon
          .from('fuel_supply_orders')
          .select('*, vehicle:fleet_vehicles(*)')
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .maybeSingle();
        if (anonRes.data) data = anonRes.data;
      }

      if (data) {
        order = data as TwoWayFuelOrder;
      }
    } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }
  }

  if (!order) {
    throw new Error(`Ordem de fornecimento nº "${orderId}" não foi encontrada no sistema.`);
  }

  // Se já foi homologada pelo Controle Interno
  if (order.status === 'auditado' && !completionData.allowAuditedEdit) {
    throw new Error(`Esta autorização já foi homologada pelo Controle Interno em ${new Date(order.supplied_at || order.created_at).toLocaleString('pt-BR')}. Para editá-la, cancele a homologação no botão "Cancelar Homologação".`);
  }

  // 2. Buscar veículo (com fallback para supabaseAnon e fallback seguro para nunca perder as fotos)
  let vehicles = getLocalVehicles();
  let vehicle = vehicles.find(v => v.id === order!.vehicle_id) || order.vehicle;

  if (!vehicle && order.vehicle_id) {
    try {
      let { data, error } = await supabase.from('fleet_vehicles').select('*').eq('id', order.vehicle_id).maybeSingle();
      if (error || !data) {
        const anonVeh = await supabaseAnon.from('fleet_vehicles').select('*').eq('id', order.vehicle_id).maybeSingle();
        if (anonVeh.data) data = anonVeh.data;
      }
      if (data) vehicle = data as FleetVehicle;
    } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }
  }

  if (!vehicle) {
    vehicle = {
      id: order.vehicle_id,
      institution_id: order.institution_id || 'inst_1',
      plate: completionData.vehicle_plate?.trim().toUpperCase() || 'FROTA',
      model: 'Veículo Oficial',
      department: 'Administração',
      fuel_type: order.fuel_type,
      tank_capacity: Math.max(Number(order.liters_authorized) || 200, 200),
      metric_type: 'km',
      expected_consumption: 8,
      current_odometer: order.previous_odometer || 0,
      status: 'ativo',
      created_at: new Date().toISOString()
    };
  }

  const isGalaoOrder =
    order.target_type === 'galao' ||
    vehicle.plate === 'GALÃO' ||
    Boolean(order.emergency_call_reason?.startsWith('[GALÃO]'));

  const suppliedLiters = completionData.liters_supplied && completionData.liters_supplied > 0
    ? completionData.liters_supplied
    : order.liters_authorized;

  // 3. Execução dos cálculos e motor antifraude (galões são isentos de odômetro)
  const audit: ConsumptionAuditCalculation = isGalaoOrder
    ? {
        delta_km: 0,
        effective_liters: suppliedLiters,
        calculated_km_per_liter: 0,
        expected_consumption: 0,
        deviation_percent: 0,
        anomaly_level: 'none',
        is_blocked: false
      }
    : calculateRealtimeMetrics(
        order.previous_odometer,
        completionData.current_odometer,
        suppliedLiters,
        vehicle.expected_consumption || 8,
        Number(vehicle.tank_capacity || 0)
      );

  const originalDetectedFraudReason = audit.anomaly_reason || order.anomaly_reason;
  const isIgnoringFraudRisk = Boolean(completionData.ignore_fraud_risk && completionData.fraud_risk_justification?.trim());
  if (isIgnoringFraudRisk) {
    audit.anomaly_level = 'none';
    audit.anomaly_reason = undefined;
    audit.is_blocked = false;
  }

  // 4. Determina status de confirmação na bomba (sempre 'abastecido', preservando anomalia para auditoria do gestor)
  const finalStatus: TwoWayOrderStatus = 'abastecido';

  // 5. Atualiza a ordem
  const updatedDriverName = completionData.driver_name?.trim() || order.driver_name;
  if (completionData.vehicle_plate && completionData.vehicle_plate.trim() && vehicle) {
    vehicle.plate = completionData.vehicle_plate.trim().toUpperCase();
  }

  const updatedFuelType: FuelType = completionData.fuel_type || order.fuel_type;
  const fuelTypeChanged = Boolean(completionData.fuel_type && completionData.fuel_type !== order.fuel_type);

  const clampedKmPerL = Math.min(Math.max(Number(audit.calculated_km_per_liter || 0), -9999.99), 9999.99);
  const clampedDev = Math.min(Math.max(Number(audit.deviation_percent || 0), -999.99), 999.99);
  const rawUnitPrice = fuelTypeChanged
    ? Number(completionData.unit_price || order.bidded_unit_price || 6.19)
    : Number(order.bidded_unit_price || completionData.unit_price || 6.19);
  const safeUnitPrice = !isNaN(rawUnitPrice) && rawUnitPrice > 0 ? rawUnitPrice : 6.19;
  const computedTotal = Number((suppliedLiters * safeUnitPrice).toFixed(2));
  const finalTotalValue = !isNaN(computedTotal) && computedTotal > 0
    ? computedTotal
    : (Number(order.total_authorized_value) || Number(order.total_value) || 0);

  const customOrderNumber = completionData.custom_order_number?.trim() || completionData.order_number?.trim();
  const finalOrderNumber = customOrderNumber ? formatOrderNumber7Digits(customOrderNumber) : order.order_number;

  // Resolução de Ficha Orçamentária se fornecida na conclusão/edição
  let rawBudgetId = completionData.budget_classification_id !== undefined
    ? (completionData.budget_classification_id || undefined)
    : (order.budget_classification_id || vehicle.budget_classification_id);

  let resolvedBudget = completionData.budget_classification;
  const localBudgets = getLocalBudgetClassifications();
  if (!resolvedBudget && rawBudgetId) {
    resolvedBudget = localBudgets.find(b => b.id === rawBudgetId || b.invoice_sheet === rawBudgetId || b.id === toBudgetUUID(String(rawBudgetId))) || order.budget_classification || vehicle.budget_classification;
  }
  let resolvedBudgetId = resolvedBudget?.id || (rawBudgetId ? toBudgetUUID(rawBudgetId) : undefined);

  // PRESERVAÇÃO ESTRITA DE DATA: Nunca altera a data automaticamente em edições!
  // Só altera a data se o usuário tiver informado explicitamente uma nova data diferente da atual.
  const existingEffectiveRawDate = (order as any).fueling_date || order.supplied_at || order.created_at;
  const existingYMD = extractOrderDateYYYYMMDD(existingEffectiveRawDate);
  const requestedYMD = completionData.supplied_at ? extractOrderDateYYYYMMDD(completionData.supplied_at) : '';
  const isExplicitDateChange = Boolean(requestedYMD && requestedYMD !== existingYMD);

  let preservedSuppliedAt: string;
  let preservedCreatedAt: string = order.created_at;

  if (isExplicitDateChange) {
    preservedSuppliedAt = `${requestedYMD}T12:00:00.000Z`;
    preservedCreatedAt = `${requestedYMD}T12:00:00.000Z`;
  } else if (existingEffectiveRawDate) {
    preservedSuppliedAt = order.supplied_at || order.created_at || new Date().toISOString();
  } else {
    preservedSuppliedAt = new Date().toISOString();
  }

  // Rastreamento de alterações (Diff) para o Log de Auditoria do Sistema
  const fieldChanges: FleetFuelAuditFieldChange[] = [];
  if (isExplicitDateChange) {
    fieldChanges.push({
      field: 'supplied_at',
      label: 'Data do Abastecimento',
      oldValue: formatDateBRFromRaw(existingEffectiveRawDate),
      newValue: formatDateBRFromRaw(preservedSuppliedAt)
    });
  }
  if (finalOrderNumber !== order.order_number) {
    fieldChanges.push({
      field: 'order_number',
      label: 'Nº da Ordem / Talão',
      oldValue: order.order_number || '-',
      newValue: finalOrderNumber
    });
  }
  const prevLiters = Number(order.liters_supplied ?? order.liters_authorized ?? 0);
  if (Math.abs(prevLiters - suppliedLiters) > 0.0001) {
    fieldChanges.push({
      field: 'liters_supplied',
      label: 'Litros Abastecidos',
      oldValue: `${prevLiters} L`,
      newValue: `${suppliedLiters} L`
    });
  }
  const prevOdo = Number(order.current_odometer ?? 0);
  if (!isGalaoOrder && prevOdo !== Number(completionData.current_odometer || 0)) {
    fieldChanges.push({
      field: 'current_odometer',
      label: 'Odômetro (KM)',
      oldValue: `${prevOdo} km`,
      newValue: `${completionData.current_odometer} km`
    });
  }
  if (fuelTypeChanged) {
    fieldChanges.push({
      field: 'fuel_type',
      label: 'Tipo de Combustível',
      oldValue: order.fuel_type || '-',
      newValue: updatedFuelType
    });
  }
  if (updatedDriverName !== order.driver_name) {
    fieldChanges.push({
      field: 'driver_name',
      label: 'Motorista / Condutor',
      oldValue: order.driver_name || '-',
      newValue: updatedDriverName
    });
  }
  const oldBudgetSheet = order.budget_classification?.invoice_sheet || order.budget_classification_id || '-';
  const newBudgetSheet = resolvedBudget?.invoice_sheet || resolvedBudgetId || '-';
  if (oldBudgetSheet !== newBudgetSheet && completionData.budget_classification_id !== undefined) {
    fieldChanges.push({
      field: 'budget_classification',
      label: 'Ficha Orçamentária',
      oldValue: String(oldBudgetSheet),
      newValue: String(newBudgetSheet)
    });
  }
  if (completionData.pump_photo_url && completionData.pump_photo_url !== order.pump_photo_url) {
    fieldChanges.push({
      field: 'pump_photo_url',
      label: 'Foto Visor da Bomba',
      oldValue: order.pump_photo_url ? 'Foto anterior' : 'Sem foto',
      newValue: 'Nova foto anexada'
    });
  }
  if (completionData.odometer_photo_url && completionData.odometer_photo_url !== order.odometer_photo_url) {
    fieldChanges.push({
      field: 'odometer_photo_url',
      label: isGalaoOrder ? 'Foto dos Galões' : 'Foto do Odômetro',
      oldValue: order.odometer_photo_url ? 'Foto anterior' : 'Sem foto',
      newValue: 'Nova foto anexada'
    });
  }

  if (isIgnoringFraudRisk && completionData.fraud_risk_justification?.trim()) {
    fieldChanges.push({
      field: 'anomaly_level',
      label: 'Risco de Fraude (Ignorado com Justificativa)',
      oldValue: originalDetectedFraudReason || 'Risco de Fraude detectado',
      newValue: `Ignorado: ${completionData.fraud_risk_justification.trim()}`
    });
  }

  const ignoredJustificationNote = isIgnoringFraudRisk && completionData.fraud_risk_justification?.trim()
    ? `[Risco de Fraude ignorado por ${completionData.actor_name || 'Gestor da Frota'}]: ${completionData.fraud_risk_justification.trim()}`
    : '';
  const mergedAuditJustification = [
    completionData.audit_justification?.trim() || order.audit_justification?.trim() || '',
    ignoredJustificationNote
  ].filter(Boolean).join('\n') || undefined;

  const updatedOrder: TwoWayFuelOrder = {
    ...order,
    order_number: finalOrderNumber,
    fuel_type: updatedFuelType,
    vehicle,
    driver_name: updatedDriverName,
    liters_supplied: suppliedLiters,
    current_odometer: completionData.current_odometer,
    calculated_km_per_liter: clampedKmPerL,
    deviation_percent: clampedDev,
    receipt_photo_url: completionData.receipt_photo_url || order.receipt_photo_url,
    receipt_attachment_url: completionData.receipt_photo_url || order.receipt_attachment_url || order.receipt_photo_url,
    odometer_photo_url: completionData.odometer_photo_url || order.odometer_photo_url,
    pump_photo_url: completionData.pump_photo_url || order.pump_photo_url,
    total_authorized_value: finalTotalValue,
    total_value: finalTotalValue,
    unit_price: safeUnitPrice,
    bidded_unit_price: fuelTypeChanged ? safeUnitPrice : order.bidded_unit_price,
    invoice_coupon_number: completionData.invoice_coupon_number?.trim() || order.invoice_coupon_number,
    anomaly_level: audit.anomaly_level,
    anomaly_reason: audit.anomaly_reason,
    audit_justification: mergedAuditJustification,
    budget_classification_id: resolvedBudgetId,
    budget_classification: resolvedBudget,
    status: finalStatus,
    created_at: preservedCreatedAt,
    supplied_at: preservedSuppliedAt
  };

  // 6. Se o odômetro avançou, atualiza o odômetro do veículo na frota
  if (!isGalaoOrder && completionData.current_odometer >= order.previous_odometer && vehicle.id) {
    vehicle.current_odometer = completionData.current_odometer;
    try {
      const vehUpdate = await supabase
        .from('fleet_vehicles')
        .update({
          current_odometer: completionData.current_odometer,
          plate: vehicle.plate
        })
        .eq('id', vehicle.id);
      if (vehUpdate.error) {
        await supabaseAnon
          .from('fleet_vehicles')
          .update({
            current_odometer: completionData.current_odometer,
            plate: vehicle.plate
          })
          .eq('id', vehicle.id);
      }
    } catch (err) {
      console.warn('[FleetFuelAudit] Aviso ao atualizar KM do veículo no Supabase:', err);
    }

    // Atualiza cache de veículos
    const vIndex = vehicles.findIndex(v => v.id === vehicle!.id);
    if (vIndex >= 0) {
      vehicles[vIndex] = { ...vehicle, current_odometer: completionData.current_odometer };
      saveLocalVehicles(vehicles);
    }
  }

  // 7. Persistir a atualização da ordem no Supabase (resiliente contra RLS, overflow numérico e queda de sessão)
  const updatePayload: Record<string, any> = {
    order_number: updatedOrder.order_number,
    fuel_type: updatedOrder.fuel_type,
    driver_name: updatedOrder.driver_name,
    liters_supplied: updatedOrder.liters_supplied,
    current_odometer: updatedOrder.current_odometer,
    calculated_km_per_liter: clampedKmPerL,
    calculated_consumption: clampedKmPerL,
    deviation_percent: clampedDev,
    is_anomaly: audit.anomaly_level !== 'none',
    receipt_photo_url: updatedOrder.receipt_photo_url || updatedOrder.receipt_attachment_url || null,
    receipt_attachment_url: updatedOrder.receipt_attachment_url || updatedOrder.receipt_photo_url || null,
    odometer_photo_url: updatedOrder.odometer_photo_url || null,
    pump_photo_url: updatedOrder.pump_photo_url || null,
    total_authorized_value: updatedOrder.total_authorized_value,
    total_value: updatedOrder.total_authorized_value,
    unit_price: safeUnitPrice,
    anomaly_level: updatedOrder.anomaly_level,
    anomaly_reason: updatedOrder.anomaly_reason || null,
    audit_justification: updatedOrder.audit_justification || null,
    status: updatedOrder.status,
    supplied_at: updatedOrder.supplied_at,
    budget_classification_id: (resolvedBudgetId && isValidUUID(resolvedBudgetId)) ? resolvedBudgetId : null
  };
  if (isExplicitDateChange) {
    updatePayload.created_at = preservedCreatedAt;
  }

  let persistedRemotely = false;
  let lastDbError: any = null;

  try {
    let { data: updateRes, error: updateErr } = await supabase
      .from('fuel_supply_orders')
      .update(updatePayload)
      .eq('id', updatedOrder.id)
      .select();

    if (updateErr || !updateRes || updateRes.length === 0) {
      if (updateErr) {
        console.warn('[FleetFuelAudit] Aviso ao atualizar via REST autenticado, usando RPC segura da bomba:', updateErr);
      }
      const { data: rpcData, error: rpcErr } = await supabaseAnon.rpc('public_complete_fuel_order', {
        p_order_id: updatedOrder.id,
        p_order_number: updatedOrder.order_number,
        p_payload: updatePayload
      });

      if (!rpcErr && rpcData?.success && rpcData?.order) {
        persistedRemotely = true;
        updateRes = [rpcData.order];
        updateErr = null;
      } else if (rpcErr) {
        const rpcMsg = String(rpcErr.message || rpcErr.details || '').toLowerCase();
        const isMissingRpc =
          rpcErr.code === 'PGRST202' ||
          rpcErr.code === '42883' ||
          rpcMsg.includes('could not find the function') ||
          rpcMsg.includes('does not exist');

        if (isMissingRpc) {
          // Compatibilidade caso o frontend seja publicado antes da migração SQL da RPC
          let { data: anonData, error: anonErr } = await supabaseAnon
            .from('fuel_supply_orders')
            .update(updatePayload)
            .eq('id', updatedOrder.id)
            .select();

          if (!anonErr && (!anonData || anonData.length === 0)) {
            const byNum = await supabaseAnon
              .from('fuel_supply_orders')
              .update(updatePayload)
              .eq('order_number', updatedOrder.order_number)
              .select();
            anonErr = byNum.error;
            anonData = byNum.data;
          }

          if (!anonErr && anonData && anonData.length > 0) {
            persistedRemotely = true;
            updateRes = anonData;
            updateErr = null;
          } else {
            const minimalPayload: Record<string, any> = {
              driver_name: updatedOrder.driver_name,
              liters_supplied: updatedOrder.liters_supplied,
              current_odometer: updatedOrder.current_odometer,
              pump_photo_url: updatedOrder.pump_photo_url || null,
              odometer_photo_url: updatedOrder.odometer_photo_url || null,
              receipt_photo_url: updatedOrder.receipt_photo_url || null,
              receipt_attachment_url: updatedOrder.receipt_attachment_url || null,
              status: 'abastecido',
              supplied_at: updatedOrder.supplied_at
            };
            const minRes = await supabaseAnon
              .from('fuel_supply_orders')
              .update(minimalPayload)
              .or(`id.eq.${updatedOrder.id},order_number.eq.${updatedOrder.order_number}`)
              .select();
            if (!minRes.error && minRes.data && minRes.data.length > 0) {
              persistedRemotely = true;
              updateRes = minRes.data;
              updateErr = null;
            } else {
              lastDbError = minRes.error || anonErr || rpcErr;
            }
          }
        } else {
          lastDbError = rpcErr;
        }
      } else if (rpcData?.error) {
        lastDbError = new Error(rpcData.error);
      }
    }

    if (!persistedRemotely && !updateErr && updateRes && updateRes.length > 0) {
      persistedRemotely = true;
    } else if (!persistedRemotely && !lastDbError && updateErr) {
      lastDbError = updateErr;
    }
  } catch (err) {
    lastDbError = err;
    console.warn('[FleetFuelAudit] Erro ao atualizar ordem no Supabase:', err);
  }

  if (!persistedRemotely && lastDbError) {
    throw new Error(`Falha ao gravar as fotos da bomba no servidor: ${lastDbError?.message || 'Verifique a conexão de internet.'}`);
  }

  // 7.1 Garante que o motorista que realizou o abastecimento esteja cadastrado no Supabase
  if (completionData.driver_name) {
    try {
      await ensureDriverExistsInSupabase({
        full_name: completionData.driver_name,
        department: vehicle?.department,
        institution_id: order.institution_id
      });
    } catch (errDrv) {
      console.warn('[FleetFuelAudit] Aviso ao auto-salvar motorista no abastecimento:', errDrv);
    }
  }

  // 8. Atualizar cache de ordens
  if (orderIndex >= 0) {
    orders[orderIndex] = updatedOrder;
  } else {
    orders.unshift(updatedOrder);
  }
  saveLocalOrders(orders);

  // 8.1 Registrar Trilha de Auditoria (Log) quando houver edição ou alteração de data/dados
  if (fieldChanges.length > 0 || completionData.is_system_edit) {
    const actionType: FleetFuelAuditActionType =
      isExplicitDateChange && fieldChanges.length === 1 ? 'ALTERACAO_DATA' : 'EDICAO_ABASTECIMENTO';
    const actionLabel =
      actionType === 'ALTERACAO_DATA'
        ? 'Alteração Manual da Data do Abastecimento'
        : isExplicitDateChange
          ? 'Edição de Dados e Data do Abastecimento'
          : 'Edição de Dados do Abastecimento (Data Preservada)';

    await recordFleetFuelAuditLog({
      institution_id: updatedOrder.institution_id || 'inst_1',
      order_id: updatedOrder.id,
      order_number: updatedOrder.order_number,
      vehicle_plate: vehicle?.plate,
      vehicle_model: vehicle?.model,
      action_type: actionType,
      action_label: actionLabel,
      actor_name: completionData.actor_name || updatedOrder.authorized_by_name || 'Gestor da Frota',
      actor_role: completionData.actor_role || updatedOrder.authorized_by_role || 'Responsável pela Frota',
      fueling_date: formatDateBRFromRaw(updatedOrder.supplied_at || updatedOrder.created_at),
      changes:
        fieldChanges.length > 0
          ? fieldChanges
          : [
              {
                field: 'geral',
                label: 'Revisão de Abastecimento',
                oldValue: 'Dados conferidos',
                newValue: 'Salvo sem alteração da data original'
              }
            ],
      notes: isExplicitDateChange
        ? `Data do abastecimento alterada manualmente pelo usuário.`
        : `Alteração realizada mantendo a data original do abastecimento (${formatDateBRFromRaw(updatedOrder.supplied_at || updatedOrder.created_at)}).`
    });
  }

  // 9. Notificar gestor de frotas e outras abas em tempo real
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestao360_fuel_order_updated', {
        detail: { orderId: updatedOrder.id, orderNumber: updatedOrder.order_number, order: updatedOrder }
      }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gestao360_fleet_channel');
        bc.postMessage({ type: 'ORDER_COMPLETED', order: updatedOrder });
        bc.close();
      }
    }
  } catch (e) {
    console.warn('[FleetFuelAudit] Erro no broadcast em tempo real:', e);
  }
  saveLocalOrders(orders);

  return { order: updatedOrder, audit };
}

/**
 * Sincroniza ordens do cache local para o Supabase (garante que ordens emitidas fiquem visíveis no celular via QR Code)
 */
export async function syncLocalOrdersToSupabase(defaultInstitutionId?: string): Promise<void> {
  const localOrders = getLocalOrders();
  if (localOrders.length === 0) return;

  try {
    const { data: remoteOrders } = await supabase.from('fuel_supply_orders').select('id, order_number').range(0, 4999);
    const remoteOrderNumbers = new Set((remoteOrders || []).map(r => r.order_number?.toLowerCase()));

    for (const ord of localOrders) {
      if (ord.anomaly_reason === 'CANCELADO_EXCLUIDO' || ord.status === 'glosado' && ord.anomaly_reason === 'CANCELADO_EXCLUIDO') {
        continue;
      }
      if (ord.order_number && !remoteOrderNumbers.has(ord.order_number.toLowerCase())) {
        const resolvedInstId =
          ord.institution_id && ord.institution_id !== 'inst_1' && ord.institution_id !== 'default'
            ? ord.institution_id
            : (defaultInstitutionId || ord.institution_id || 'inst_1');
        const orderRecord: Record<string, any> = {
          id: ord.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ord.id) ? ord.id : generateUUID(),
          institution_id: resolvedInstId,
          order_number: ord.order_number,
          vehicle_id: ord.vehicle_id,
          driver_name: ord.driver_name,
          driver_document: ord.driver_document,
          station_name: ord.station_name,
          fuel_type: ord.fuel_type,
          bidded_unit_price: ord.bidded_unit_price,
          liters_authorized: ord.liters_authorized,
          total_authorized_value: ord.total_authorized_value,
          previous_odometer: ord.previous_odometer,
          current_odometer: ord.current_odometer,
          calculated_km_per_liter: ord.calculated_km_per_liter,
          anomaly_level: ord.anomaly_level || 'none',
          supply_mode: ord.supply_mode || 'litragem_fixa',
          pump_photo_url: ord.pump_photo_url,
          authorized_by_name: ord.authorized_by_name || 'Gestor de Frotas',
          authorized_by_role: ord.authorized_by_role || 'Gestor de Frotas',
          status: (ord.status === 'aguardando_abastecimento' || !ord.status) ? 'autorizado_pendente' : ord.status,
          created_at: ord.created_at || new Date().toISOString()
        };

        try {
          const { error: insErr } = await supabase.from('fuel_supply_orders').insert([orderRecord]);
          if (insErr) {
            console.warn('[FleetFuelAudit] Erro ao sincronizar ordem individual no Supabase:', ord.order_number, insErr);
          }
        } catch (errSync) {
          console.warn('[FleetFuelAudit] Erro ao sincronizar ordem individual:', ord.order_number, errSync);
        }
      }
    }
  } catch (err) {
    console.warn('[FleetFuelAudit] Aviso ao sincronizar ordens locais com Supabase:', err);
  }
}

function removeLocalOrderByIdentifier(clean: string) {
  try {
    const cleanLower = clean.toLowerCase();
    const cleanAlpha = clean.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const orders = getLocalOrders();
    const filtered = orders.filter(o => {
      if (!o) return false;
      if (o.id && o.id.toLowerCase() === cleanLower) return false;
      if (o.order_number && o.order_number.toLowerCase() === cleanLower) return false;
      const oAlpha = (o.order_number || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (oAlpha === cleanAlpha) return false;
      return true;
    });
    saveLocalOrders(filtered);
  } catch (caughtErr) { bestEffort('operação auxiliar de interface/formatação; mantém valor original', caughtErr); }
}

/**
 * Consulta ordem pública por número sequencial, placa ou UUID (para o QR Code /validar-abastecimento)
 * Prioridade Absoluta: SUPABASE (Remote-First). 
 * Se uma ordem foi excluída no painel do gestor, o celular consultará o banco e saberá imediatamente
 * que ela não existe mais, expurgando cópias fantasmas do cache local.
 */
export async function getFuelAuthorizationByNumber(identifier: string): Promise<TwoWayFuelOrder | null> {
  const clean = identifier.trim();
  if (!clean) return null;

  // Ignorar palavras-chave de rotas para evitar buscas falsas na inicialização
  const ignoredRoutes = ['validar-abastecimento', 'validar-combustivel', 'valida-abastecimento', 'validar', 'abastecimento'];
  if (ignoredRoutes.includes(clean.toLowerCase())) {
    return null;
  }

  const clean7 = formatOrderNumber7Digits(clean);
  const cleanAlphanumeric = clean.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean);

  let networkFailed = false;

  // 1. CONSULTA VIA RPC SEGURA DA BOMBA (ou cliente autenticado quando logado)
  try {
    const { data: rpcOrder, error: rpcErr } = await supabaseAnon.rpc('public_get_fuel_order_by_number', {
      p_identifier: clean
    });

    if (!rpcErr) {
      if (rpcOrder) {
        if (rpcOrder.anomaly_reason === 'CANCELADO_EXCLUIDO' || rpcOrder.status === 'cancelado') {
          removeLocalOrderByIdentifier(clean);
          return null;
        }
        return rpcOrder as TwoWayFuelOrder;
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const hasAuthSession = Boolean(sessionData?.session);

    if (hasAuthSession) {
      const orderMatch = clean7 && clean7 !== clean
        ? `order_number.ilike.${clean},order_number.ilike.${clean7},order_number.ilike.%${clean}%`
        : `order_number.ilike.${clean},order_number.ilike.%${clean}%`;

      const runOrderQuery = (client: any) => {
        let q = client.from('fuel_supply_orders').select('*, vehicle:fleet_vehicles(*)');
        if (isUUID) {
          q = q.or(`id.eq.${clean},order_number.ilike.${clean}`);
        } else {
          q = q.or(orderMatch);
        }
        return q.order('created_at', { ascending: false }).limit(1).maybeSingle();
      };

      const { data, error } = await runOrderQuery(supabase);

      if (!error) {
        if (data) {
          if (data.anomaly_reason === 'CANCELADO_EXCLUIDO' || data.status === 'cancelado') {
            removeLocalOrderByIdentifier(clean);
            return null;
          }
          return data as TwoWayFuelOrder;
        } else {
          removeLocalOrderByIdentifier(clean);
          return null;
        }
      } else {
        console.warn('[FleetFuelAudit] Erro na consulta do Supabase:', error);
        networkFailed = true;
      }
    } else if (rpcErr) {
      console.warn('[FleetFuelAudit] Erro na RPC pública de abastecimento:', rpcErr);
      networkFailed = true;
    } else {
      removeLocalOrderByIdentifier(clean);
      return null;
    }
  } catch (err) {
    console.warn('[FleetFuelAudit] Falha de conexão ao consultar Supabase:', err);
    networkFailed = true;
  }

  // 2. FALLBACK SECUNDÁRIO: Somente executado se o celular estiver 100% sem internet (offline)
  if (networkFailed) {
    const orders = getLocalOrders();
    const foundLocal = orders.find(o => {
      if (!o) return false;
      if (o.order_number && (o.order_number.toLowerCase() === clean.toLowerCase() || o.order_number === clean7)) return true;
      if (o.id === clean) return true;
      const orderNumAlpha = (o.order_number || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (orderNumAlpha && orderNumAlpha === cleanAlphanumeric) return true;
      if (cleanAlphanumeric.length >= 1 && orderNumAlpha.endsWith(cleanAlphanumeric)) return true;
      const plateAlpha = (o.vehicle?.plate || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (plateAlpha && plateAlpha === cleanAlphanumeric) return true;
      return false;
    });

    if (foundLocal) {
      if (foundLocal.anomaly_reason === 'CANCELADO_EXCLUIDO' || foundLocal.status === 'cancelado') {
        return null;
      }
      const vehicles = getLocalVehicles();
      const vehicle = vehicles.find(v => v.id === foundLocal!.vehicle_id);
      return { ...foundLocal, vehicle: foundLocal.vehicle || vehicle };
    }
  }

  return null;
}

/**
 * Ação do Auditor de Controle Interno (Aprovar com Justificativa ou Glosar)
 */
export async function auditFuelAuthorization(
  orderId: string,
  action: 'approve' | 'glosar',
  justification: string,
  auditorName: string = 'Auditor de Controle Interno'
): Promise<TwoWayFuelOrder> {
  const orders = getLocalOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);

  if (orderIndex === -1) {
    throw new Error('Ordem não localizada para auditoria.');
  }

  const order = orders[orderIndex];
  const newStatus: TwoWayOrderStatus = action === 'approve' ? 'auditado' : 'glosado';

  const fullJustification = `[${new Date().toLocaleString('pt-BR')} - ${auditorName}] ${action === 'approve' ? 'APROVADO COM JUSTIFICATIVA' : 'GLOSADO / BLOQUEADO'}: ${justification}`;

  const updatedOrder: TwoWayFuelOrder = {
    ...order,
    status: newStatus,
    audit_justification: order.audit_justification
      ? `${order.audit_justification}\n\n${fullJustification}`
      : fullJustification
  };

  try {
    await supabase.from('fuel_supply_orders').update({
      status: updatedOrder.status,
      audit_justification: updatedOrder.audit_justification
    }).eq('id', orderId);
  } catch (err) {
    console.warn('[FleetFuelAudit] Erro ao persistir auditoria no Supabase:', err);
  }

  orders[orderIndex] = updatedOrder;
  saveLocalOrders(orders);

  return updatedOrder;
}

/**
 * Comprime fotografias tiradas na bomba/odômetro para até 1280px e qualidade equilibrada,
 * reduzindo fotos pesadas de celulares (5MB-10MB) para ~150KB, garantindo uploads ultra-rápidos
 * mesmo em conexões móveis 3G/4G no posto de combustível.
 */
export async function compressFuelPhoto(file: File): Promise<File> {
  if (typeof window === 'undefined' || file.type === 'application/pdf') return file;
  return compressImageFile(file, {
    maxDimension: 960,
    quality: 0.68,
    preferWebp: true,
  });
}

/**
 * Upload de comprovante físico (canhoto assinado, foto da bomba ou foto do odômetro)
 * Comprime em WebP/JPEG (~40-70KB) e envia ao Supabase Storage para não pesar o banco Postgres.
 */
export async function uploadFuelDocumentPhoto(file: File, folder: 'receipts' | 'odometers' | 'pumps' | 'invoices'): Promise<string> {
  try {
    return await uploadOptimizedImageToStorage(file, {
      buckets: [BUCKET_NAME, 'certidoes', 'creche_documents'],
      folder,
      maxDimension: 960,
      quality: 0.68,
      preferWebp: true,
    });
  } catch (err) {
    console.warn('[FleetFuelAudit] Storage indisponível, aplicando fallback ultra-compacto:', err);
  }

  // Fallback de emergência ultra-compactado (640px, qualidade 0.45) caso Storage esteja offline
  const tinyFile = await compressImageFile(file, {
    maxDimension: 640,
    quality: 0.45,
    preferWebp: true,
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(tinyFile);
  });
}

/**
 * Vincula a Nota Fiscal / Fatura após recebimento oficial na Prefeitura
 * Permite conciliar o lote de requisições com a fatura do posto
 */
export async function linkInvoiceToFuelOrder(
  orderId: string,
  invoiceNumber: string,
  invoiceKey?: string,
  invoiceAttachmentUrl?: string
): Promise<TwoWayFuelOrder> {
  const orders = getLocalOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);

  if (orderIndex === -1) {
    throw new Error('Ordem de fornecimento não encontrada.');
  }

  const order = orders[orderIndex];
  const updatedOrder: TwoWayFuelOrder = {
    ...order,
    invoice_coupon_number: invoiceNumber.trim()
  };

  try {
    await supabase.from('fuel_supply_orders').update({
      invoice_coupon_number: updatedOrder.invoice_coupon_number
    }).eq('id', orderId);
  } catch (err) {
    console.warn('[FleetFuelAudit] Erro ao vincular NF no Supabase:', err);
  }

  orders[orderIndex] = updatedOrder;
  saveLocalOrders(orders);

  return updatedOrder;
}

/**
 * Lançamento individual de Canhoto Físico / Abastecimento Antigo (Transição Legada)
 * Já entra com status 'abastecido', recalculando consumo histórico e atualizando o odômetro do veículo se aplicável.
 */
export async function registerLegacyFuelOrder(payload: LegacyVoucherPayload): Promise<TwoWayFuelOrder> {
  const suppliedDate = parseExcelDate(payload.supplied_at);
  if (!suppliedDate) {
    throw new Error(`Data de abastecimento inválida ou ausente ("${String(payload.supplied_at ?? '')}").`);
  }

  // 1. Localizar veículo por ID ou Placa
  let vehicles = getLocalVehicles();
  let vehicle: FleetVehicle | undefined;

  if (payload.vehicle_id) {
    vehicle = vehicles.find(v => v.id === payload.vehicle_id);
  }

  if (!vehicle && payload.plate) {
    const cleanPlate = payload.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    vehicle = vehicles.find(v => v.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanPlate);
  }

  if (!vehicle) {
    try {
      if (payload.vehicle_id) {
        const { data } = await supabase.from('fleet_vehicles').select('*').eq('id', payload.vehicle_id).maybeSingle();
        if (data) vehicle = data as FleetVehicle;
      } else if (payload.plate) {
        const cleanPlate = payload.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const { data } = await supabase.from('fleet_vehicles').select('*').ilike('plate', `%${cleanPlate}%`).maybeSingle();
        if (data) vehicle = data as FleetVehicle;
      }
    } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }
  }

  if (!vehicle) {
    throw new Error(`Veículo ${payload.plate ? `de placa "${payload.plate}"` : ''} não foi localizado na frota municipal.`);
  }

  const litersSupplied = Number(payload.liters_supplied);
  if (isNaN(litersSupplied) || litersSupplied <= 0) {
    throw new Error('A litragem do canhoto deve ser superior a zero.');
  }

  const unitPrice = Number(payload.unit_price) > 0 ? Number(payload.unit_price) : 6.19;
  const totalValue = Number((litersSupplied * unitPrice).toFixed(2));

  const odoReading = Number(payload.odometer_reading) || 0;
  const previousOdometer = Number(vehicle.current_odometer || 0);

  // Se o odômetro do canhoto for maior que o atual do veículo, atualizamos o odômetro do veículo
  const shouldUpdateVehicleOdo = odoReading > previousOdometer;

  const currentYear = new Date(payload.supplied_at || new Date()).getFullYear() || new Date().getFullYear();
  let orderNumber = payload.custom_order_number?.trim() || payload.voucher_number?.trim();
  if (orderNumber) {
    orderNumber = formatOrderNumber7Digits(orderNumber);
  } else {
    orderNumber = await getNextOrderNumber7Digits();
  }

  const resolvedBudgetId = payload.budget_classification_id || vehicle.budget_classification_id;
  const localBudgets = getLocalBudgetClassifications();
  const resolvedBudget = localBudgets.find(b => b.id === resolvedBudgetId) || vehicle.budget_classification;

  const deltaKm = odoReading > previousOdometer ? odoReading - previousOdometer : 0;
  const calculatedKmPerLiter = deltaKm > 0 && litersSupplied > 0
    ? Number((deltaKm / litersSupplied).toFixed(2))
    : undefined;

  const newOrder: TwoWayFuelOrder = {
    id: generateUUID(),
    institution_id: payload.institution_id || vehicle.institution_id || 'inst_1',
    order_number: orderNumber,
    vehicle_id: vehicle.id,
    vehicle: vehicle,
    driver_name: payload.driver_name?.trim() || 'Motorista Municipal',
    driver_document: payload.driver_document?.trim() || undefined,
    station_name: payload.station_name?.trim() || 'Posto Credenciado',
    fuel_type: payload.fuel_type || vehicle.fuel_type,
    bidded_unit_price: unitPrice,
    liters_authorized: litersSupplied,
    liters_supplied: litersSupplied,
    total_authorized_value: totalValue,
    previous_odometer: previousOdometer,
    current_odometer: odoReading,
    calculated_km_per_liter: calculatedKmPerLiter,
    receipt_photo_url: payload.receipt_photo_url || undefined,
    receipt_attachment_url: payload.receipt_photo_url || undefined,
    anomaly_level: 'none',
    supply_mode: 'canhoto_legado',
    is_legacy_voucher: true,
    voucher_number: payload.voucher_number?.trim() || undefined,
    notes: payload.notes?.trim() || 'Lançamento retroativo de canhoto/talão físico antigo',
    authorized_by_name: 'Gestor de Frotas',
    authorized_by_role: 'Lançamento Legado',
    budget_classification_id: resolvedBudgetId,
    budget_classification: resolvedBudget,
    status: 'abastecido',
    created_at: suppliedDate,
    supplied_at: suppliedDate
  };

  // 1. Persistir no Supabase
  const { error: insertErr } = await supabase.from('fuel_supply_orders').insert([{
    id: newOrder.id,
    institution_id: newOrder.institution_id,
    order_number: newOrder.order_number,
    vehicle_id: newOrder.vehicle_id,
    driver_name: newOrder.driver_name,
    driver_document: newOrder.driver_document,
    station_name: newOrder.station_name,
    fuel_type: newOrder.fuel_type,
    liters_authorized: newOrder.liters_authorized,
    liters_supplied: newOrder.liters_supplied,
    unit_price: newOrder.bidded_unit_price,
    total_value: newOrder.total_authorized_value,
    previous_odometer: newOrder.previous_odometer,
    current_odometer: newOrder.current_odometer,
    receipt_photo_url: newOrder.receipt_photo_url,
    receipt_attachment_url: newOrder.receipt_attachment_url,
    status: 'abastecido',
    created_at: newOrder.created_at,
    supplied_at: newOrder.supplied_at
  }]);

  if (insertErr) {
    console.error('[FleetFuelAudit] Erro ao persistir canhoto no Supabase:', insertErr);
    throw new Error(`Falha ao gravar lançamento no Supabase: ${insertErr.message}`);
  }

  if (shouldUpdateVehicleOdo) {
    try {
      await supabase.from('fleet_vehicles').update({
        current_odometer: odoReading
      }).eq('id', vehicle.id);
    } catch (errDb) {
      console.warn('[FleetFuelAudit] Aviso ao atualizar odômetro do veículo no Supabase:', errDb);
    }
  }

  // 2. Atualizar veículos locais se a KM evoluiu
  if (shouldUpdateVehicleOdo) {
    const localVehicles = getLocalVehicles();
    const vIdx = localVehicles.findIndex(v => v.id === vehicle!.id);
    if (vIdx !== -1) {
      localVehicles[vIdx].current_odometer = odoReading;
      saveLocalVehicles(localVehicles);
    }
  }

  // 3. Atualizar lista de ordens local
  const currentOrders = getLocalOrders();
  currentOrders.unshift(newOrder);
  saveLocalOrders(currentOrders);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestao360_fuel_order_updated', {
        detail: { order: newOrder }
      }));
    }
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }

  return newOrder;
}

export interface AdvanceTravelFuelPayload {
  order_number?: string;
  vehicle_id: string;
  driver_name: string;
  station_name?: string;
  liters_supplied: number;
  odometer_reading: number;
  total_value?: number;
  unit_price?: number;
  supplied_at?: string;
  odometer_photo_url?: string;
  pump_photo_url?: string;
  notes?: string;
  authorized_by_name?: string;
  institution_id?: string;
}

/**
 * Gera a numeração própria sequencial para Abastecimentos de Adiantamento (ADT-0001, ADT-0002...),
 * totalmente independente da sequência comum das ordens de abastecimento.
 */
export async function getNextAdvanceOrderNumber(institutionId?: string): Promise<string> {
  let maxSeq = 0;

  const extractSeq = (num?: string | null) => {
    if (!num) return 0;
    const match = String(num).toUpperCase().match(/^ADT-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  };

  try {
    const localOrders = getLocalOrders();
    for (const o of localOrders) {
      const seq = extractSeq(o.order_number);
      if (seq > maxSeq) maxSeq = seq;
    }
  } catch (caughtErr) { bestEffort('operação auxiliar de interface/formatação; mantém valor original', caughtErr); }

  try {
    let query = supabase
      .from('fuel_supply_orders')
      .select('order_number')
      .ilike('order_number', 'ADT-%');
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }
    const { data } = await query;
    if (data && Array.isArray(data)) {
      for (const row of data) {
        const seq = extractSeq((row as any).order_number);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }

  return `ADT-${String(maxSeq + 1).padStart(4, '0')}`;
}

/**
 * Lançamento de Abastecimento por Adiantamento de Viagem
 * Registra abastecimentos pagos via adiantamento ao motorista durante viagens,
 * preservando as fotos do odômetro e da bomba e atualizando a quilometragem do veículo
 * para não distorcer a média de consumo (km/L).
 */
export async function registerAdvanceTravelFuelOrder(
  payload: AdvanceTravelFuelPayload
): Promise<TwoWayFuelOrder> {
  let vehicles = getLocalVehicles();
  let vehicle = vehicles.find(v => v.id === payload.vehicle_id);

  if (!vehicle) {
    try {
      const { data } = await supabase
        .from('fleet_vehicles')
        .select('*')
        .eq('id', payload.vehicle_id)
        .maybeSingle();
      if (data) vehicle = data as FleetVehicle;
    } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }
  }

  if (!vehicle) {
    throw new Error('Veículo não localizado na frota municipal.');
  }

  const litersSupplied = Number(payload.liters_supplied);
  if (isNaN(litersSupplied) || litersSupplied <= 0) {
    throw new Error('Informe uma litragem válida maior que zero.');
  }

  const odoReading = Number(payload.odometer_reading);
  if (isNaN(odoReading) || odoReading <= 0) {
    throw new Error('Informe o odômetro (KM) registrado na viagem.');
  }

  const previousOdometer = Number(vehicle.current_odometer || 0);
  const shouldUpdateVehicleOdo = odoReading > previousOdometer;
  const deltaKm = odoReading > previousOdometer ? odoReading - previousOdometer : 0;
  const calculatedKmPerLiter = deltaKm > 0 && litersSupplied > 0
    ? Number((deltaKm / litersSupplied).toFixed(2))
    : undefined;

  const totalInput = Number(payload.total_value || 0);
  const unitInput = Number(payload.unit_price || 0);
  if (totalInput <= 0 && unitInput <= 0) {
    throw new Error('Informe o valor total pago (R$) ou o preço por litro praticado no posto da viagem.');
  }
  const unitPrice = totalInput > 0
    ? Number((totalInput / litersSupplied).toFixed(3))
    : Number(unitInput.toFixed(3));
  const totalValue = totalInput > 0
    ? Number(totalInput.toFixed(2))
    : Number((litersSupplied * unitPrice).toFixed(2));

  const orderNumber = payload.order_number?.trim() || (await getNextAdvanceOrderNumber(payload.institution_id));
  const suppliedDate = payload.supplied_at
    ? (payload.supplied_at.includes('T') ? payload.supplied_at : `${payload.supplied_at}T12:00:00.000Z`)
    : new Date().toISOString();

  const resolvedBudgetId = vehicle.budget_classification_id;
  const localBudgets = getLocalBudgetClassifications();
  const resolvedBudget = localBudgets.find(b => b.id === resolvedBudgetId) || vehicle.budget_classification;

  const newOrder: TwoWayFuelOrder = {
    id: generateUUID(),
    institution_id: payload.institution_id || vehicle.institution_id || 'inst_1',
    order_number: orderNumber,
    vehicle_id: vehicle.id,
    vehicle,
    driver_name: payload.driver_name?.trim() || 'Motorista em Viagem',
    station_name: payload.station_name?.trim() || 'Posto em Viagem (Adiantamento)',
    fuel_type: vehicle.fuel_type,
    bidded_unit_price: unitPrice,
    liters_authorized: litersSupplied,
    liters_supplied: litersSupplied,
    total_authorized_value: totalValue,
    previous_odometer: previousOdometer,
    current_odometer: odoReading,
    calculated_km_per_liter: calculatedKmPerLiter,
    odometer_photo_url: payload.odometer_photo_url || undefined,
    pump_photo_url: payload.pump_photo_url || undefined,
    receipt_photo_url: payload.pump_photo_url || payload.odometer_photo_url || undefined,
    anomaly_level: 'none',
    supply_mode: 'adiantamento_viagem',
    notes: payload.notes?.trim()
      ? `[Adiantamento de Viagem] ${payload.notes.trim()}`
      : '[Adiantamento de Viagem] Abastecimento em viagem com adiantamento ao motorista.',
    authorized_by_name: payload.authorized_by_name?.trim() || 'Responsável pela Frota',
    authorized_by_role: 'Adiantamento de Viagem',
    budget_classification_id: resolvedBudgetId,
    budget_classification: resolvedBudget,
    status: 'abastecido',
    created_at: suppliedDate,
    supplied_at: suppliedDate
  };

  const advanceRecord: Record<string, any> = {
    id: newOrder.id,
    institution_id: newOrder.institution_id,
    order_number: newOrder.order_number,
    vehicle_id: newOrder.vehicle_id,
    driver_name: newOrder.driver_name,
    station_name: newOrder.station_name,
    fuel_type: newOrder.fuel_type,
    bidded_unit_price: newOrder.bidded_unit_price,
    liters_authorized: newOrder.liters_authorized,
    liters_supplied: newOrder.liters_supplied,
    total_authorized_value: newOrder.total_authorized_value,
    previous_odometer: newOrder.previous_odometer,
    current_odometer: newOrder.current_odometer,
    calculated_km_per_liter: newOrder.calculated_km_per_liter,
    anomaly_level: 'none',
    odometer_photo_url: newOrder.odometer_photo_url,
    pump_photo_url: newOrder.pump_photo_url,
    receipt_photo_url: newOrder.receipt_photo_url,
    // Mantém 'litragem_fixa' por compatibilidade com constraint CHECK do banco remoto,
    // identificando o adiantamento via authorized_by_role e audit_justification.
    supply_mode: 'litragem_fixa',
    audit_justification: newOrder.notes,
    authorized_by_name: newOrder.authorized_by_name,
    authorized_by_role: 'Adiantamento de Viagem',
    status: 'abastecido',
    created_at: newOrder.created_at,
    supplied_at: newOrder.supplied_at
  };

  if (resolvedBudgetId && isValidUUID(resolvedBudgetId)) {
    advanceRecord.budget_classification_id = resolvedBudgetId;
  }

  try {
    let { data, error } = await supabase.from('fuel_supply_orders').insert([advanceRecord]).select().single();

    // Retry removendo colunas opcionais caso o schema remoto ainda não as possua
    let attempts = 0;
    while (error && error.code === 'PGRST204' && attempts < 4) {
      attempts++;
      const missingMatch = error.message?.match(/'([^']+)' column/);
      if (missingMatch?.[1] && missingMatch[1] in advanceRecord) {
        delete advanceRecord[missingMatch[1]];
      } else {
        delete advanceRecord.budget_classification_id;
        delete advanceRecord.audit_justification;
        delete advanceRecord.supply_mode;
      }
      const retry = await supabase.from('fuel_supply_orders').insert([advanceRecord]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error && error.code === '23505') {
      const freshNumber = await getNextOrderNumber7Digits();
      newOrder.order_number = freshNumber;
      advanceRecord.order_number = freshNumber;
      const retryDup = await supabase.from('fuel_supply_orders').insert([advanceRecord]).select().single();
      data = retryDup.data;
      error = retryDup.error;
    }

    if (!error && data) {
      newOrder.id = data.id;
    } else if (error) {
      console.error('[FleetFuelAudit] Erro ao gravar adiantamento no Supabase:', error);
      throw new Error(`Falha ao gravar adiantamento no Supabase: ${error.message}`);
    }

    if (shouldUpdateVehicleOdo) {
      await supabase.from('fleet_vehicles').update({
        current_odometer: odoReading
      }).eq('id', vehicle.id);
    }
  } catch (errDb) {
    console.warn('[FleetFuelAudit] Aviso ao persistir abastecimento de adiantamento no Supabase:', errDb);
    if (errDb instanceof Error && errDb.message.includes('Supabase:')) {
      throw errDb;
    }
  }

  if (shouldUpdateVehicleOdo) {
    const localVehicles = getLocalVehicles();
    const vIdx = localVehicles.findIndex(v => v.id === vehicle!.id);
    if (vIdx !== -1) {
      localVehicles[vIdx].current_odometer = odoReading;
      saveLocalVehicles(localVehicles);
    }
  }

  const currentOrders = getLocalOrders();
  currentOrders.unshift(newOrder);
  saveLocalOrders(currentOrders);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestao360_fuel_order_updated', {
        detail: { order: newOrder }
      }));
    }
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }

  return newOrder;
}

export interface RejectedLegacyBatchRow {
  rowNumber: number;
  identifier: string;
  reason: string;
}

/**
 * Importação em Lote de Canhotos Antigos (via Planilha Excel ou CSV).
 * Preserva o número original da linha na planilha e rejeita explicitamente datas inválidas.
 */
export async function registerLegacyFuelOrdersBatch(
  payloads: LegacyVoucherPayload[]
): Promise<{ successCount: number; errors: string[]; rejectedRows: RejectedLegacyBatchRow[] }> {
  const errors: string[] = [];
  const rejectedRows: RejectedLegacyBatchRow[] = [];
  let successCount = 0;

  const validIndexed: Array<{ rowNumber: number; parsedIso: string; timestampMs: number; item: LegacyVoucherPayload }> = [];

  payloads.forEach((item, idx) => {
    const rowNumber = idx + 1;
    const identifier = item.plate || item.voucher_number || item.custom_order_number || 'Sem identificação';
    const parsedIso = parseExcelDate(item.supplied_at);
    if (!parsedIso) {
      const reason = `Data de abastecimento inválida ou ausente ("${String(item.supplied_at ?? '')}").`;
      rejectedRows.push({ rowNumber, identifier, reason });
      errors.push(`Linha ${rowNumber} (${identifier}): ${reason}`);
      return;
    }
    validIndexed.push({
      rowNumber,
      parsedIso,
      timestampMs: new Date(parsedIso).getTime(),
      item: { ...item, supplied_at: parsedIso },
    });
  });

  // Ordena cronologicamente por data validada para evoluir o odômetro na ordem natural
  validIndexed.sort((a, b) => a.timestampMs - b.timestampMs);

  for (const entry of validIndexed) {
    const identifier = entry.item.plate || entry.item.voucher_number || entry.item.custom_order_number || 'Sem identificação';
    try {
      await registerLegacyFuelOrder(entry.item);
      successCount++;
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      rejectedRows.push({ rowNumber: entry.rowNumber, identifier, reason });
      errors.push(`Linha ${entry.rowNumber} (${identifier}): ${reason}`);
    }
  }

  rejectedRows.sort((a, b) => a.rowNumber - b.rowNumber);
  return { successCount, errors, rejectedRows };
}

/**
 * Gera e realiza o download do arquivo modelo de planilha Excel (.xlsx) para importação de canhotos antigos
 */
export function generateLegacyVouchersExcelTemplate(): void {
  const sampleData = [
    {
      'Num_Autorizacao': '0412',
      'Placa': 'ABC-1D23',
      'Combustivel': 'Diesel S-10',
      'Data_Abastecimento': '15/10/2026 14:30',
      'Km_Odometro': 85420,
      'Litros': 45.5,
      'Preco_Unitario': 6.19,
      'Motorista': 'João da Silva',
      'Posto': 'Auto Posto Central',
      'Num_Canhoto': 'Talão 0412',
      'Observacoes': 'Canhoto físico antigo'
    },
    {
      'Num_Autorizacao': '0413',
      'Placa': 'XYZ-9E88',
      'Combustivel': 'Gasolina Comum',
      'Data_Abastecimento': '16/10/2026 10:15',
      'Km_Odometro': 112340,
      'Litros': 50.0,
      'Preco_Unitario': 6.29,
      'Motorista': 'Maria Santos',
      'Posto': 'Auto Posto Torixoréu',
      'Num_Canhoto': 'Canhoto 0188',
      'Observacoes': 'Saúde - Transporte de Pacientes'
    }
  ];

  void downloadWorkbookXlsx(
    [
      {
        name: 'Canhotos_Antigos',
        rows: sampleData,
        colWidths: [18, 14, 18, 20, 14, 12, 15, 24, 26, 16, 30],
      },
    ],
    'modelo_importacao_canhotos_antigos.xlsx'
  );
}

/**
 * Permite alterar / corrigir a Ficha Orçamentária vinculada a uma ordem de abastecimento
 * a qualquer momento depois (mesmo após autorizada, abastecida na bomba ou em auditoria).
 */
export async function updateFuelOrderBudgetClassification(
  orderId: string,
  budgetId: string,
  _institutionId: string = 'inst_1',
  actorName?: string,
  actorRole?: string
): Promise<TwoWayFuelOrder> {
  const localBudgets = getLocalBudgetClassifications();
  const targetBudget = localBudgets.find(b => 
    b.id === budgetId || 
    b.invoice_sheet === budgetId || 
    b.id === toBudgetUUID(budgetId)
  );
  const resolvedBudgetId = targetBudget?.id || toBudgetUUID(budgetId);

  // 1. Atualizar cache de ordens TwoWay e ordens reais locais
  const orders = getLocalOrders();
  let orderIdx = orders.findIndex(o => o.id === orderId || o.order_number === orderId);
  let baseOrder: TwoWayFuelOrder | null = orderIdx !== -1 ? orders[orderIdx] : null;

  if (!baseOrder) {
    try {
      const rawReal = localStorage.getItem('gestao360_real_orders');
      if (rawReal) {
        const realList = JSON.parse(rawReal) as TwoWayFuelOrder[];
        const rIdx = realList.findIndex(o => o.id === orderId || o.order_number === orderId);
        if (rIdx !== -1) {
          baseOrder = realList[rIdx];
        }
      }
    } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }
  }

  const oldSheet = baseOrder?.budget_classification?.invoice_sheet || baseOrder?.budget_classification_id || 'Não definida';
  const newSheet = targetBudget ? `Ficha ${targetBudget.invoice_sheet} (${targetBudget.department_local})` : String(budgetId);

  // Preserva integralmente supplied_at e created_at originais
  const updatedOrder: TwoWayFuelOrder = {
    ...(baseOrder || { id: orderId, order_number: orderId } as any),
    budget_classification_id: resolvedBudgetId,
    budget_classification: targetBudget || baseOrder?.budget_classification
  };

  if (orderIdx !== -1) {
    orders[orderIdx] = updatedOrder;
  } else {
    orders.unshift(updatedOrder);
  }
  saveLocalOrders(orders);

  // Também atualiza o gestao360_real_orders
  try {
    const rawReal = localStorage.getItem('gestao360_real_orders');
    if (rawReal) {
      const realList = JSON.parse(rawReal) as TwoWayFuelOrder[];
      const rIdx = realList.findIndex(o => o.id === orderId || o.order_number === orderId);
      if (rIdx !== -1) {
        realList[rIdx] = updatedOrder;
      } else {
        realList.unshift(updatedOrder);
      }
      localStorage.setItem('gestao360_real_orders', JSON.stringify(realList));
    }
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }

  // 2. Persistir no Supabase remoto usando a sincronização em nuvem resiliente (institutions.notes e coluna)
  try {
    await saveFuelOrderBudgetToSupabase(
      orderId,
      updatedOrder.order_number,
      resolvedBudgetId,
      _institutionId || 'inst_1'
    );
  } catch (dbErr) {
    console.warn('[FleetFuelAudit] Aviso ao persistir ficha orçamentária no Supabase:', dbErr);
  }

  // 2.1 Registrar log de auditoria da alteração de dotação (com data de abastecimento preservada)
  await recordFleetFuelAuditLog({
    institution_id: _institutionId || updatedOrder.institution_id || 'inst_1',
    order_id: updatedOrder.id,
    order_number: updatedOrder.order_number || orderId,
    vehicle_plate: updatedOrder.vehicle?.plate,
    vehicle_model: updatedOrder.vehicle?.model,
    action_type: 'ALTERACAO_DOTACAO',
    action_label: 'Reclassificação de Ficha Orçamentária (Data Preservada)',
    actor_name: actorName || updatedOrder.authorized_by_name || 'Gestor da Frota',
    actor_role: actorRole || 'Responsável pela Frota',
    fueling_date: formatDateBRFromRaw(updatedOrder.supplied_at || updatedOrder.created_at),
    changes: [
      {
        field: 'budget_classification',
        label: 'Ficha Orçamentária',
        oldValue: String(oldSheet).startsWith('Ficha') ? String(oldSheet) : `Ficha ${oldSheet}`,
        newValue: newSheet
      }
    ],
    notes: `Dotação alterada sem modificar a data original do abastecimento (${formatDateBRFromRaw(updatedOrder.supplied_at || updatedOrder.created_at)}).`
  });

  // 3. Notificar abas em tempo real
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestao360_fuel_order_updated', {
        detail: { orderId: updatedOrder.id, orderNumber: updatedOrder.order_number, order: updatedOrder }
      }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gestao360_fleet_channel');
        bc.postMessage({ type: 'ORDER_BUDGET_UPDATED', order: updatedOrder });
        bc.close();
      }
    }
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }

  return updatedOrder;
}

/**
 * Permite alterar especificamente a Data do Abastecimento de qualquer ordem (autorizada, abastecida ou auditada),
 * gravando no Supabase, no cache local e registrando a alteração no Log de Auditoria.
 */
export async function updateFuelOrderDate(
  orderId: string,
  newDateYYYYMMDD: string,
  actorName: string = 'Gestor da Frota',
  actorRole: string = 'Responsável pela Frota',
  institutionId: string = 'inst_1'
): Promise<TwoWayFuelOrder> {
  const cleanYMD = extractOrderDateYYYYMMDD(newDateYYYYMMDD);
  if (!cleanYMD || !/^\d{4}-\d{2}-\d{2}$/.test(cleanYMD)) {
    throw new Error('Informe uma data válida para o abastecimento.');
  }
  const newIso = `${cleanYMD}T12:00:00.000Z`;

  const orders = getLocalOrders();
  const orderIdx = orders.findIndex(o => o.id === orderId || o.order_number === orderId);
  let baseOrder: TwoWayFuelOrder | null = orderIdx !== -1 ? orders[orderIdx] : null;

  if (!baseOrder) {
    try {
      const { data } = await supabase
        .from('fuel_supply_orders')
        .select('*, vehicle:fleet_vehicles(*)')
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .maybeSingle();
      if (data) baseOrder = data as TwoWayFuelOrder;
    } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }
  }

  if (!baseOrder) {
    throw new Error('Ordem de abastecimento não localizada.');
  }

  const oldRawDate = (baseOrder as any).fueling_date || baseOrder.supplied_at || baseOrder.created_at;
  const oldDateBR = formatDateBRFromRaw(oldRawDate);
  const newDateBR = formatDateBRFromRaw(newIso);

  const updatedOrder: TwoWayFuelOrder = {
    ...baseOrder,
    created_at: newIso,
    supplied_at: baseOrder.supplied_at ? newIso : newIso
  };
  (updatedOrder as any).fueling_date = cleanYMD;

  if (orderIdx !== -1) {
    orders[orderIdx] = updatedOrder;
  } else {
    orders.unshift(updatedOrder);
  }
  saveLocalOrders(orders);

  try {
    let { error } = await supabase
      .from('fuel_supply_orders')
      .update({
        supplied_at: newIso,
        created_at: newIso
      })
      .eq('id', updatedOrder.id);

    if (error) {
      await supabaseAnon
        .from('fuel_supply_orders')
        .update({
          supplied_at: newIso,
          created_at: newIso
        })
        .or(`id.eq.${updatedOrder.id},order_number.eq.${updatedOrder.order_number}`);
    }
  } catch (err) {
    console.warn('[FleetFuelAudit] Aviso ao atualizar data no Supabase:', err);
  }

  if (oldDateBR !== newDateBR) {
    await recordFleetFuelAuditLog({
      institution_id: institutionId || updatedOrder.institution_id || 'inst_1',
      order_id: updatedOrder.id,
      order_number: updatedOrder.order_number,
      vehicle_plate: updatedOrder.vehicle?.plate,
      vehicle_model: updatedOrder.vehicle?.model,
      action_type: 'ALTERACAO_DATA',
      action_label: 'Alteração Manual da Data do Abastecimento',
      actor_name: actorName,
      actor_role: actorRole,
      fueling_date: newDateBR,
      changes: [
        {
          field: 'supplied_at',
          label: 'Data do Abastecimento',
          oldValue: oldDateBR,
          newValue: newDateBR
        }
      ],
      notes: `Data do abastecimento alterada manualmente de ${oldDateBR} para ${newDateBR}.`
    });
  }

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestao360_fuel_order_updated', {
        detail: { orderId: updatedOrder.id, orderNumber: updatedOrder.order_number, order: updatedOrder }
      }));
    }
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }

  return updatedOrder;
}

/**
 * Permite alterar o tipo de combustível de uma autorização/ordem já emitida
 * (antes ou depois da baixa na bomba), recalculando o valor e registrando no Log de Auditoria.
 */
export async function updateFuelOrderFuelType(
  orderId: string,
  newFuelType: FuelType,
  newUnitPrice: number,
  actorName: string = 'Gestor da Frota',
  actorRole: string = 'Responsável pela Frota',
  institutionId: string = 'inst_1'
): Promise<TwoWayFuelOrder> {
  const orders = getLocalOrders();
  const orderIdx = orders.findIndex(o => o.id === orderId || o.order_number === orderId);
  let baseOrder: TwoWayFuelOrder | null = orderIdx !== -1 ? orders[orderIdx] : null;

  if (!baseOrder) {
    try {
      const { data } = await supabase
        .from('fuel_supply_orders')
        .select('*, vehicle:fleet_vehicles(*)')
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .maybeSingle();
      if (data) baseOrder = data as TwoWayFuelOrder;
    } catch (caughtErr) { reportError('fleetFuelAudit:rede', caughtErr); }
  }

  if (!baseOrder) {
    throw new Error('Ordem de abastecimento não localizada.');
  }

  const oldFuelType = baseOrder.fuel_type;
  const safePrice = !isNaN(Number(newUnitPrice)) && Number(newUnitPrice) > 0
    ? Number(newUnitPrice)
    : Number(baseOrder.bidded_unit_price || baseOrder.unit_price || 6.19);
  const effectiveLiters = Number(baseOrder.liters_supplied || baseOrder.liters_authorized || 0);
  const newTotalValue = Number((effectiveLiters * safePrice).toFixed(2));

  const updatedOrder: TwoWayFuelOrder = {
    ...baseOrder,
    fuel_type: newFuelType,
    unit_price: safePrice,
    bidded_unit_price: safePrice,
    total_authorized_value: newTotalValue,
    total_value: newTotalValue
  };

  if (orderIdx !== -1) {
    orders[orderIdx] = updatedOrder;
  } else {
    orders.unshift(updatedOrder);
  }
  saveLocalOrders(orders);

  const dbPatch: Record<string, any> = {
    fuel_type: newFuelType,
    unit_price: safePrice,
    bidded_unit_price: safePrice,
    total_authorized_value: newTotalValue,
    total_value: newTotalValue
  };

  try {
    let { error } = await supabase
      .from('fuel_supply_orders')
      .update(dbPatch)
      .eq('id', updatedOrder.id);

    if (error) {
      await supabaseAnon
        .from('fuel_supply_orders')
        .update(dbPatch)
        .or(`id.eq.${updatedOrder.id},order_number.eq.${updatedOrder.order_number}`);
    }
  } catch (err) {
    console.warn('[FleetFuelAudit] Aviso ao atualizar combustível no Supabase:', err);
  }

  if (oldFuelType !== newFuelType) {
    const rawDate = (updatedOrder as any).fueling_date || updatedOrder.supplied_at || updatedOrder.created_at;
    await recordFleetFuelAuditLog({
      institution_id: institutionId || updatedOrder.institution_id || 'inst_1',
      order_id: updatedOrder.id,
      order_number: updatedOrder.order_number,
      vehicle_plate: updatedOrder.vehicle?.plate,
      vehicle_model: updatedOrder.vehicle?.model,
      action_type: 'ALTERACAO_COMBUSTIVEL',
      action_label: 'Alteração do Tipo de Combustível da Autorização',
      actor_name: actorName,
      actor_role: actorRole,
      fueling_date: formatDateBRFromRaw(rawDate),
      changes: [
        {
          field: 'fuel_type',
          label: 'Tipo de Combustível',
          oldValue: oldFuelType || '-',
          newValue: newFuelType
        }
      ],
      notes: `Combustível alterado de ${oldFuelType} para ${newFuelType} (preço unitário R$ ${safePrice.toFixed(3)}/L).`
    });
  }

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestao360_fuel_order_updated', {
        detail: { orderId: updatedOrder.id, orderNumber: updatedOrder.order_number, order: updatedOrder }
      }));
    }
  } catch (caughtErr) { bestEffort('armazenamento local indisponível ou JSON local inválido; segue com valor padrão', caughtErr); }

  return updatedOrder;
}

export { cancelFuelOrderHomologation } from './fleetFuel';

