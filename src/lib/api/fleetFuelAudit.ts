/**
-- ====================================================================
-- SERVIÇO DE AUDITORIA MATEMÁTICA E VALIDAÇÃO EM DUAS VIAS DE FROTAS
-- Arquivo: src/lib/api/fleetFuelAudit.ts
-- Gestão 360 - Módulo de Frotas / Controles Internos
-- Regras de Auditoria Matemática, Matriz de Risco e Preços Licitados
-- ====================================================================
*/

import { supabase, supabaseAnon } from '../supabase';
import * as XLSX from 'xlsx';
import { FleetVehicle, FuelType, MetricType, FleetBudgetClassification, getLocalBudgetClassifications, getNextFuelOrderSequence, ensureDriverExistsInSupabase, toBudgetUUID, isValidUUID } from './fleetFuel';

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
            try { localStorage.setItem(getPricesStorageKey(targetInst), JSON.stringify(remotePrices)); } catch { }
          }
          return remotePrices;
        }
      } catch { }
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
  } catch { }
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
  } catch { }

  // Sincroniza diretamente com a tabela institutions.notes no Supabase (Fonte Única da Verdade)
  try {
    let currentNotesObj: Record<string, any> = {};
    const { data: instData } = await supabase.from('institutions').select('notes').eq('id', targetInst).maybeSingle();
    if (instData?.notes) {
      try { currentNotesObj = JSON.parse(instData.notes); } catch { }
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
  vehicle_id: string;
  vehicle?: FleetVehicle;
  driver_name: string;
  driver_document?: string;
  station_name: string;
  fuel_type: FuelType;
  bidded_unit_price: number; // Preço unitário fixo da licitação
  liters_authorized: number;
  total_authorized_value: number; // liters_authorized * bidded_unit_price
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
  supply_mode: 'litragem_fixa' | 'encher_tanque' | 'canhoto_legado';
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
  vehicle_id: string;
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
}

export interface OrderCompletionPayload {
  current_odometer: number;
  liters_supplied?: number;
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
  } catch { }
  return [];
}

/**
 * Salva ordens locais
 */
function saveLocalOrders(orders: TwoWayFuelOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch { }
}

/**
 * Lê veículos locais
 */
function getLocalVehicles(): FleetVehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VEHICLES);
    if (raw) return JSON.parse(raw);
  } catch { }
  return [];
}

function saveLocalVehicles(vehicles: FleetVehicle[]) {
  try {
    localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
  } catch { }
}

/**
 * Cálculo dinâmico em tempo real do consumo e matriz antifraude
 */
export function calculateRealtimeMetrics(
  previousOdometer: number,
  currentOdometer: number,
  liters: number,
  expectedConsumption: number,
  tankCapacity: number
): ConsumptionAuditCalculation {
  const delta_km = currentOdometer - previousOdometer;
  const effective_liters = liters > 0 ? liters : 1;
  const raw_km_per_liter = Number((delta_km / effective_liters).toFixed(2));
  const calculated_km_per_liter = Math.min(Math.max(raw_km_per_liter, -9999.99), 9999.99);

  let deviation_percent = 0;
  if (expectedConsumption > 0) {
    const raw_dev = Number(
      (((calculated_km_per_liter - expectedConsumption) / expectedConsumption) * 100).toFixed(2)
    );
    deviation_percent = Math.min(Math.max(raw_dev, -999.99), 999.99);
  }

  let anomaly_level: AnomalyLevel = 'none';
  let anomaly_reason: string | undefined = undefined;
  let is_blocked = false;

  // 1. Bloqueio Crítico: Odômetro regressivo ou igual
  if (currentOdometer <= previousOdometer) {
    anomaly_level = 'bloqueio_critico';
    anomaly_reason = `Odômetro Regressivo ou Inconsistente: KM informado (${currentOdometer}) é menor ou igual ao anterior (${previousOdometer}).`;
    is_blocked = true;
  }
  // 2. Bloqueio Crítico: Volume abastecido superior à capacidade física do tanque
  else if (liters > tankCapacity) {
    anomaly_level = 'bloqueio_critico';
    anomaly_reason = `Volume Superior à Capacidade do Tanque: Foram informados ${liters}L para um tanque de capacidade máxima de ${tankCapacity}L.`;
    is_blocked = true;
  }
  // 3. Bloqueio Crítico: Desvio maior que -25% (consumo muito pior que o esperado - suspeita de dreno/desvio)
  else if (deviation_percent < -25) {
    anomaly_level = 'bloqueio_critico';
    anomaly_reason = `Consumo Crítico: Suspeita de Dreno/Desvio. Consumo apurado de ${calculated_km_per_liter} km/l teve desvio de ${deviation_percent}% em relação ao esperado (${expectedConsumption} km/l).`;
    is_blocked = true;
  }
  // 4. Alerta Amarelo: Desvio entre -15% e -25%
  else if (deviation_percent < -15 && deviation_percent >= -25) {
    anomaly_level = 'alerta_amarelo';
    anomaly_reason = `Consumo com Desvio Moderado: Rendimento de ${calculated_km_per_liter} km/l teve variação de ${deviation_percent}% da meta (${expectedConsumption} km/l). Justificativa formal exigida.`;
    is_blocked = false;
  }

  return {
    delta_km,
    effective_liters,
    calculated_km_per_liter,
    expected_consumption: expectedConsumption,
    deviation_percent,
    anomaly_level,
    anomaly_reason,
    is_blocked
  };
}

/**
 * 1. issueFuelAuthorization: Emite autorização prévia e gera a Via do Sistema travada
 */
export async function issueFuelAuthorization(payload: IssueOrderPayload): Promise<TwoWayFuelOrder> {
  // 1. Localizar veículo
  let vehicles = getLocalVehicles();
  let vehicle = vehicles.find(v => v.id === payload.vehicle_id);

  if (!vehicle) {
    // Tenta carregar do Supabase
    try {
      const { data } = await supabase.from('fleet_vehicles').select('*').eq('id', payload.vehicle_id).single();
      if (data) {
        vehicle = data as FleetVehicle;
      }
    } catch { }
  }

  if (!vehicle) {
    throw new Error('Veículo informado não foi localizado no cadastro oficial da frota municipal.');
  }

  // 2. Validações de Negócio
  if (payload.liters_authorized <= 0) {
    throw new Error('A litragem autorizada deve ser superior a zero.');
  }

  if (payload.liters_authorized > vehicle.tank_capacity) {
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

  const supply_mode = payload.supply_mode || (vehicle.always_full_tank ? 'encher_tanque' : 'litragem_fixa');
  const liters_authorized = supply_mode === 'encher_tanque'
    ? vehicle.tank_capacity
    : payload.liters_authorized;

  const total_authorized_value = Number((liters_authorized * payload.bidded_unit_price).toFixed(2));
  const previous_odometer = Number(vehicle.current_odometer || 0);
  const current_odometer = payload.current_odometer && Number(payload.current_odometer) > 0
    ? Number(payload.current_odometer)
    : previous_odometer;

  const delta_km = current_odometer > previous_odometer ? current_odometer - previous_odometer : 0;

  // 4. Sequencial "AUT-YYYY-XXXX" ou número personalizado para seguir requisição em papel
  let orderNumber = payload.custom_order_number?.trim();
  if (!orderNumber) {
    const currentYear = new Date().getFullYear();
    const nextSeq = await getNextFuelOrderSequence('AUT', currentYear);
    orderNumber = `AUT-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  }

  const newOrder: TwoWayFuelOrder = {
    id: generateUUID(),
    institution_id: payload.institution_id || vehicle.institution_id || 'inst_1',
    order_number: orderNumber,
    vehicle_id: vehicle.id,
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
    supply_mode: supply_mode,
    is_full_tank_order: !!payload.is_full_tank_order || supply_mode === 'encher_tanque',
    emergency_call_reason: payload.emergency_call_reason,
    pump_photo_url: payload.pump_photo_url || undefined,
    authorized_by_name: payload.authorized_by_name || 'Gestor de Frotas',
    authorized_by_role: payload.authorized_by_role || 'Gestor de Frotas',
    budget_classification_id: resolvedBudgetId,
    budget_classification: resolvedBudget,
    status: 'autorizado_pendente',
    created_at: new Date().toISOString()
  };

  // 5. Garantir que o veículo exista no Supabase antes da ordem (evita erro de foreign key)
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

  // 6. Persistir no Supabase de forma resiliente
  const orderRecord: Record<string, any> = {
    id: newOrder.id,
    institution_id: newOrder.institution_id,
    order_number: newOrder.order_number,
    vehicle_id: newOrder.vehicle_id,
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

  // Se tiver um UUID de budget_classification_id, inclui na gravação
  if (resolvedBudgetId && isValidUUID(resolvedBudgetId)) {
    orderRecord.budget_classification_id = resolvedBudgetId;
  }

  try {
    let { data, error } = await supabase.from('fuel_supply_orders').insert([orderRecord]).select().single();

    // Se o schema remoto ainda não tiver a coluna budget_classification_id, retenta sem ela para garantir a gravação
    if (error && (error.code === 'PGRST204' || error.message?.includes('budget_classification_id'))) {
      delete orderRecord.budget_classification_id;
      const retry = await supabase.from('fuel_supply_orders').insert([orderRecord]).select().single();
      data = retry.data;
      error = retry.error;
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
  if (current_odometer > previous_odometer) {
    try {
      await supabase
        .from('fleet_vehicles')
        .update({ current_odometer: current_odometer })
        .eq('id', vehicle.id);
    } catch { }

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
      let { data, error } = await supabase
        .from('fuel_supply_orders')
        .select('*, vehicle:fleet_vehicles(*)')
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .maybeSingle();

      if (error || !data) {
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
    } catch { }
  }

  if (!order) {
    throw new Error(`Ordem de fornecimento nº "${orderId}" não foi encontrada no sistema.`);
  }

  // Se já foi homologada pelo Controle Interno
  if (order.status === 'auditado') {
    throw new Error(`Esta autorização já foi homologada pelo Controle Interno em ${new Date(order.supplied_at || order.created_at).toLocaleString('pt-BR')} e não pode mais ser alterada.`);
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
    } catch { }
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

  const suppliedLiters = completionData.liters_supplied && completionData.liters_supplied > 0
    ? completionData.liters_supplied
    : order.liters_authorized;

  // 3. Execução dos cálculos e motor antifraude
  const audit = calculateRealtimeMetrics(
    order.previous_odometer,
    completionData.current_odometer,
    suppliedLiters,
    vehicle.expected_consumption || 8,
    vehicle.tank_capacity || 200
  );

  // 4. Determina status de confirmação na bomba (sempre 'abastecido', preservando anomalia para auditoria do gestor)
  const finalStatus: TwoWayOrderStatus = 'abastecido';

  // 5. Atualiza a ordem
  const updatedDriverName = completionData.driver_name?.trim() || order.driver_name;
  if (completionData.vehicle_plate && completionData.vehicle_plate.trim() && vehicle) {
    vehicle.plate = completionData.vehicle_plate.trim().toUpperCase();
  }

  const clampedKmPerL = Math.min(Math.max(Number(audit.calculated_km_per_liter || 0), -9999.99), 9999.99);
  const clampedDev = Math.min(Math.max(Number(audit.deviation_percent || 0), -999.99), 999.99);
  const finalTotalValue = order.supply_mode === 'encher_tanque' || order.is_full_tank_order
    ? Number((suppliedLiters * Number(order.bidded_unit_price || 0)).toFixed(2))
    : Number((suppliedLiters * Number(order.bidded_unit_price || 0)).toFixed(2)) || order.total_authorized_value;

  const customOrderNumber = completionData.custom_order_number?.trim() || completionData.order_number?.trim();
  const finalOrderNumber = customOrderNumber || order.order_number;

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

  const updatedOrder: TwoWayFuelOrder = {
    ...order,
    order_number: finalOrderNumber,
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
    invoice_coupon_number: completionData.invoice_coupon_number?.trim() || order.invoice_coupon_number,
    anomaly_level: audit.anomaly_level,
    anomaly_reason: audit.anomaly_reason,
    audit_justification: completionData.audit_justification || order.audit_justification,
    budget_classification_id: resolvedBudgetId,
    budget_classification: resolvedBudget,
    status: finalStatus,
    supplied_at: completionData.supplied_at || new Date().toISOString()
  };

  // 6. Se o odômetro avançou, atualiza o odômetro do veículo na frota
  if (completionData.current_odometer >= order.previous_odometer && vehicle.id) {
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
    unit_price: order.bidded_unit_price,
    anomaly_level: updatedOrder.anomaly_level,
    anomaly_reason: updatedOrder.anomaly_reason || null,
    audit_justification: updatedOrder.audit_justification || null,
    status: updatedOrder.status,
    supplied_at: updatedOrder.supplied_at,
    budget_classification_id: (resolvedBudgetId && isValidUUID(resolvedBudgetId)) ? resolvedBudgetId : null
  };

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
        console.warn('[FleetFuelAudit] Aviso ao atualizar com supabase padrão, tentando com supabaseAnon:', updateErr);
      }
      const retryAnon = await supabaseAnon
        .from('fuel_supply_orders')
        .update(updatePayload)
        .eq('id', updatedOrder.id)
        .select();
      updateErr = retryAnon.error;
      updateRes = retryAnon.data;
    }

    if (!updateErr && (!updateRes || updateRes.length === 0)) {
      const byNum = await supabaseAnon
        .from('fuel_supply_orders')
        .update(updatePayload)
        .eq('order_number', updatedOrder.order_number)
        .select();
      updateErr = byNum.error;
      updateRes = byNum.data;
    }

    if (!updateErr && updateRes && updateRes.length > 0) {
      persistedRemotely = true;
    } else if (updateErr) {
      lastDbError = updateErr;
      // Fallback mínimo garantido caso alguma coluna secundária falhe na validação do banco
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
        lastDbError = null;
      } else if (minRes.error) {
        lastDbError = minRes.error;
      }
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
export async function syncLocalOrdersToSupabase(): Promise<void> {
  const localOrders = getLocalOrders();
  if (localOrders.length === 0) return;

  try {
    const { data: remoteOrders } = await supabase.from('fuel_supply_orders').select('id, order_number');
    const remoteOrderNumbers = new Set((remoteOrders || []).map(r => r.order_number?.toLowerCase()));

    for (const ord of localOrders) {
      if (ord.anomaly_reason === 'CANCELADO_EXCLUIDO' || ord.status === 'glosado' && ord.anomaly_reason === 'CANCELADO_EXCLUIDO') {
        continue;
      }
      if (ord.order_number && !remoteOrderNumbers.has(ord.order_number.toLowerCase())) {
        const orderRecord: Record<string, any> = {
          id: ord.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ord.id) ? ord.id : generateUUID(),
          institution_id: ord.institution_id || 'inst_1',
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
  } catch { }
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

  const cleanAlphanumeric = clean.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean);

  let networkFailed = false;

  // 1. CONSULTA DIRETA NO SUPABASE (Fonte Única da Verdade, com fallback para supabaseAnon)
  try {
    const runOrderQuery = (client: any) => {
      let q = client.from('fuel_supply_orders').select('*, vehicle:fleet_vehicles(*)');
      if (isUUID) {
        q = q.or(`id.eq.${clean},order_number.ilike.${clean}`);
      } else {
        q = q.or(`order_number.ilike.${clean},order_number.ilike.%${clean}%`);
      }
      return q.order('created_at', { ascending: false }).limit(1).maybeSingle();
    };

    let { data, error } = await runOrderQuery(supabase);
    if (error) {
      const retryAnon = await runOrderQuery(supabaseAnon);
      data = retryAnon.data;
      error = retryAnon.error;
    }

    if (!error) {
      if (data) {
        if (data.anomaly_reason === 'CANCELADO_EXCLUIDO' || data.status === 'cancelado') {
          removeLocalOrderByIdentifier(clean);
          return null;
        }
        return data as TwoWayFuelOrder;
      } else {
        // Se a busca com join retornou vazio, tenta busca direta simples sem join
        const runSimpleQuery = (client: any) => {
          let sq = client.from('fuel_supply_orders').select('*');
          if (isUUID) {
            sq = sq.eq('id', clean);
          } else {
            sq = sq.or(`order_number.ilike.${clean},order_number.ilike.%${clean}%`);
          }
          return sq.order('created_at', { ascending: false }).limit(1).maybeSingle();
        };

        let { data: rawOrder, error: simpleErr } = await runSimpleQuery(supabase);
        if (simpleErr) {
          const retrySimple = await runSimpleQuery(supabaseAnon);
          rawOrder = retrySimple.data;
          simpleErr = retrySimple.error;
        }

        if (!simpleErr) {
          if (rawOrder) {
            if (rawOrder.anomaly_reason === 'CANCELADO_EXCLUIDO' || rawOrder.status === 'cancelado') {
              removeLocalOrderByIdentifier(clean);
              return null;
            }
            const orderObj = rawOrder as TwoWayFuelOrder;
            if (orderObj.vehicle_id) {
              try {
                let { data: vData } = await supabase.from('fleet_vehicles').select('*').eq('id', orderObj.vehicle_id).maybeSingle();
                if (!vData) {
                  const anonV = await supabaseAnon.from('fleet_vehicles').select('*').eq('id', orderObj.vehicle_id).maybeSingle();
                  vData = anonV.data;
                }
                if (vData) orderObj.vehicle = vData as FleetVehicle;
              } catch { }
            }
            return orderObj;
          } else {
            // O BANCO DE DADOS NÃO POSSUI ESTA ORDEM (FOI EXCLUÍDA!)
            // Remove imediatamente do cache do aparelho para não exibir dados obsoletos
            removeLocalOrderByIdentifier(clean);
            return null;
          }
        }
      }
    } else {
      console.warn('[FleetFuelAudit] Erro na consulta do Supabase:', error);
      networkFailed = true;
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
      if (o.order_number && o.order_number.toLowerCase() === clean.toLowerCase()) return true;
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
  const MAX_DIM = 1280;

  const drawSourceToJpeg = (source: CanvasImageSource, origW: number, origH: number): Promise<File> => {
    let width = origW;
    let height = origH;
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round(height * (MAX_DIM / width));
        width = MAX_DIM;
      } else {
        width = Math.round(width * (MAX_DIM / height));
        height = MAX_DIM;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);
    }
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const cleanBase = (file.name || 'foto_abastecimento').replace(/\.[^/.]+$/, '');
          resolve(new File([blob], `${cleanBase}.jpg`, { type: 'image/jpeg' }));
        } else {
          resolve(file);
        }
      }, 'image/jpeg', 0.80);
    });
  };

  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      const out = await drawSourceToJpeg(bitmap, bitmap.width, bitmap.height);
      try { bitmap.close(); } catch {}
      return out;
    }
  } catch {
    // Fallback para Image + ObjectURL (Safari iOS / WebViews Android)
  }

  try {
    return await new Promise<File>((resolve) => {
      const objUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        URL.revokeObjectURL(objUrl);
        try {
          const out = await drawSourceToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
          resolve(out);
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(file);
      };
      img.src = objUrl;
    });
  } catch {
    return file;
  }
}

/**
 * Upload de comprovante físico (canhoto assinado, foto da bomba ou foto do odômetro)
 * Suporta fallback resiliente entre cliente autenticado, cliente anon, bucket secundário e Base64 compactado.
 */
export async function uploadFuelDocumentPhoto(file: File, folder: 'receipts' | 'odometers' | 'pumps' | 'invoices'): Promise<string> {
  const processedFile = await compressFuelPhoto(file);
  const fileExt = processedFile.type === 'application/pdf' ? 'pdf' : 'jpg';
  const contentType = processedFile.type || 'image/jpeg';
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  // 1. Tentar upload via Supabase Storage (bucket principal e fallback)
  for (const targetBucket of [BUCKET_NAME, 'certidoes']) {
    try {
      let uploadRes = await supabase.storage
        .from(targetBucket)
        .upload(fileName, processedFile, {
          contentType,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadRes.error) {
        uploadRes = await supabaseAnon.storage
          .from(targetBucket)
          .upload(fileName, processedFile, {
            contentType,
            cacheControl: '3600',
            upsert: true
          });
      }

      if (!uploadRes.error) {
        const { data: publicUrlData } = supabaseAnon.storage
          .from(targetBucket)
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn(`[FleetFuelAudit] Exceção no upload de foto no bucket ${targetBucket}:`, err);
    }
  }

  // 2. Fallback seguro em Base64 compactado caso o Storage esteja inacessível
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(processedFile);
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
 * Converte qualquer representação de data de planilha (número serial Excel, string BR ou ISO) em ISO String válido
 */
export function parseExcelDate(raw: any): string {
  if (!raw) return new Date().toISOString();
  if (typeof raw === 'number') {
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? new Date().toISOString() : raw.toISOString();
  }
  const str = String(raw).trim();
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]) - 1;
    const year = Number(brMatch[3]);
    const hours = Number(brMatch[4] || 12);
    const minutes = Number(brMatch[5] || 0);
    const seconds = Number(brMatch[6] || 0);
    const d = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Lançamento individual de Canhoto Físico / Abastecimento Antigo (Transição Legada)
 * Já entra com status 'abastecido', recalculando consumo histórico e atualizando o odômetro do veículo se aplicável.
 */
export async function registerLegacyFuelOrder(payload: LegacyVoucherPayload): Promise<TwoWayFuelOrder> {
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
    } catch { }
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
  let orderNumber = payload.custom_order_number?.trim();
  if (!orderNumber) {
    const nextSeq = await getNextFuelOrderSequence('AUT', currentYear);
    orderNumber = `AUT-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  }

  const resolvedBudgetId = payload.budget_classification_id || vehicle.budget_classification_id;
  const localBudgets = getLocalBudgetClassifications();
  const resolvedBudget = localBudgets.find(b => b.id === resolvedBudgetId) || vehicle.budget_classification;

  const deltaKm = odoReading > previousOdometer ? odoReading - previousOdometer : 0;
  const calculatedKmPerLiter = deltaKm > 0 && litersSupplied > 0
    ? Number((deltaKm / litersSupplied).toFixed(2))
    : undefined;

  const suppliedDate = payload.supplied_at ? parseExcelDate(payload.supplied_at) : new Date().toISOString();

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
  try {
    await supabase.from('fleet_supply_orders').insert([{
      id: newOrder.id,
      institution_id: newOrder.institution_id,
      order_number: newOrder.order_number,
      vehicle_id: newOrder.vehicle_id,
      driver_name: newOrder.driver_name,
      driver_document: newOrder.driver_document,
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
      supply_mode: newOrder.supply_mode,
      receipt_photo_url: newOrder.receipt_photo_url,
      authorized_by_name: newOrder.authorized_by_name,
      authorized_by_role: newOrder.authorized_by_role,
      status: 'abastecido',
      created_at: newOrder.created_at,
      supplied_at: newOrder.supplied_at
    }]);

    await supabase.from('fuel_supply_orders').insert([{
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
      status: 'abastecido',
      created_at: newOrder.created_at,
      supplied_at: newOrder.supplied_at
    }]);

    if (shouldUpdateVehicleOdo) {
      await supabase.from('fleet_vehicles').update({
        current_odometer: odoReading
      }).eq('id', vehicle.id);
    }
  } catch (errDb) {
    console.warn('[FleetFuelAudit] Aviso ao persistir canhoto antigo no Supabase:', errDb);
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
  } catch { }

  return newOrder;
}

/**
 * Importação em Lote de Canhotos Antigos (via Planilha Excel ou CSV)
 */
export async function registerLegacyFuelOrdersBatch(
  payloads: LegacyVoucherPayload[]
): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  // Ordena cronologicamente por data para que a evolução do odômetro ocorra na ordem natural
  const sorted = [...payloads].sort((a, b) => new Date(a.supplied_at).getTime() - new Date(b.supplied_at).getTime());

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    try {
      await registerLegacyFuelOrder(item);
      successCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Linha ${i + 1} (${item.plate || item.voucher_number || 'Sem identificação'}): ${msg}`);
    }
  }

  return { successCount, errors };
}

/**
 * Gera e realiza o download do arquivo modelo de planilha Excel (.xlsx) para importação de canhotos antigos
 */
export function generateLegacyVouchersExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

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

  const ws = XLSX.utils.json_to_sheet(sampleData);

  ws['!cols'] = [
    { wch: 18 }, // Num_Autorizacao
    { wch: 14 }, // Placa
    { wch: 18 }, // Combustivel
    { wch: 20 }, // Data_Abastecimento
    { wch: 14 }, // Km_Odometro
    { wch: 12 }, // Litros
    { wch: 15 }, // Preco_Unitario
    { wch: 24 }, // Motorista
    { wch: 26 }, // Posto
    { wch: 16 }, // Num_Canhoto
    { wch: 30 }  // Observacoes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Canhotos_Antigos');
  XLSX.writeFile(wb, 'modelo_importacao_canhotos_antigos.xlsx');
}

/**
 * Permite alterar / corrigir a Ficha Orçamentária vinculada a uma ordem de abastecimento
 * a qualquer momento depois (mesmo após autorizada, abastecida na bomba ou em auditoria).
 */
export async function updateFuelOrderBudgetClassification(
  orderId: string,
  budgetId: string,
  _institutionId: string = 'inst_1'
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
    } catch {}
  }

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
  } catch {}

  // 2. Persistir no Supabase remoto
  try {
    const updatePayload: Record<string, any> = { budget_classification_id: resolvedBudgetId };
    let query = supabase.from('fuel_supply_orders').update(updatePayload);
    if (isValidUUID(orderId)) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }
    let { error } = await query;

    if (error) {
      let anonQuery = supabaseAnon.from('fuel_supply_orders').update(updatePayload);
      if (isValidUUID(orderId)) {
        anonQuery = anonQuery.eq('id', orderId);
      } else {
        anonQuery = anonQuery.eq('order_number', orderId);
      }
      await anonQuery;
    }
  } catch (dbErr) {
    console.warn('[FleetFuelAudit] Aviso ao persistir ficha orçamentária no Supabase:', dbErr);
  }

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
  } catch {}

  return updatedOrder;
}

