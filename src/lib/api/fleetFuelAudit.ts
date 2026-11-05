/**
-- ====================================================================
-- SERVIÇO DE AUDITORIA MATEMÁTICA E VALIDAÇÃO EM DUAS VIAS DE FROTAS
-- Arquivo: src/lib/api/fleetFuelAudit.ts
-- Gestão 360 - Módulo de Frotas / Controles Internos
-- Regras de Auditoria Matemática, Matriz de Risco e Preços Licitados
-- ====================================================================
*/

import { supabase, supabaseAnon } from '../supabase';
import { FleetVehicle, FuelType, MetricType, FleetBudgetClassification, getLocalBudgetClassifications, getNextFuelOrderSequence, ensureDriverExistsInSupabase } from './fleetFuel';

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
            try { localStorage.setItem(getPricesStorageKey(targetInst), JSON.stringify(remotePrices)); } catch {}
          }
          return remotePrices;
        }
      } catch {}
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
  } catch {}
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
  } catch {}

  // Sincroniza diretamente com a tabela institutions.notes no Supabase (Fonte Única da Verdade)
  try {
    let currentNotesObj: Record<string, any> = {};
    const { data: instData } = await supabase.from('institutions').select('notes').eq('id', targetInst).maybeSingle();
    if (instData?.notes) {
      try { currentNotesObj = JSON.parse(instData.notes); } catch {}
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
  odometer_photo_url?: string;
  pump_photo_url?: string; // Foto do visor da bomba de combustível
  invoice_coupon_number?: string;
  anomaly_level: AnomalyLevel;
  anomaly_reason?: string;
  audit_justification?: string;
  supply_mode: 'litragem_fixa' | 'encher_tanque';
  authorized_by_name: string;
  authorized_by_role: string;
  budget_classification_id?: string;
  budget_classification?: FleetBudgetClassification;
  status: TwoWayOrderStatus;
  created_at: string;
  supplied_at?: string;
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
  pump_photo_url?: string;
  authorized_by_name?: string;
  authorized_by_role?: string;
  budget_classification_id?: string;
  budget_classification?: FleetBudgetClassification;
  institution_id?: string;
}

export interface OrderCompletionPayload {
  current_odometer: number;
  liters_supplied?: number;
  receipt_photo_url?: string;
  odometer_photo_url?: string;
  pump_photo_url?: string;
  invoice_coupon_number?: string;
  audit_justification?: string;
  supplied_at?: string;
  driver_name?: string;
  vehicle_plate?: string;
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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
  } catch {}
  return [];
}

/**
 * Salva ordens locais
 */
function saveLocalOrders(orders: TwoWayFuelOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch {}
}

/**
 * Lê veículos locais
 */
function getLocalVehicles(): FleetVehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VEHICLES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalVehicles(vehicles: FleetVehicle[]) {
  try {
    localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
  } catch {}
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
  const calculated_km_per_liter = Number((delta_km / effective_liters).toFixed(2));

  let deviation_percent = 0;
  if (expectedConsumption > 0) {
    deviation_percent = Number(
      (((calculated_km_per_liter - expectedConsumption) / expectedConsumption) * 100).toFixed(2)
    );
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
    } catch {}
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
  const resolvedBudgetId = payload.budget_classification_id || vehicle.budget_classification_id;
  const localBudgets = getLocalBudgetClassifications();
  const resolvedBudget: FleetBudgetClassification | undefined = payload.budget_classification || 
    localBudgets.find(b => b.id === resolvedBudgetId) || 
    vehicle.budget_classification;

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

  // 4. Sequencial "AUT-YYYY-XXXX" estritamente crescente e contínuo
  // Mesmo que uma ordem anterior seja excluída, a numeração nunca retrocede ou gera duplicidade.
  const currentYear = new Date().getFullYear();
  const nextSeq = await getNextFuelOrderSequence('AUT', currentYear);
  const orderNumber = `AUT-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

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

  // Se tiver um UUID válido de budget_classification_id, tenta incluir
  const isBudgetUUID = newOrder.budget_classification_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newOrder.budget_classification_id);
  if (isBudgetUUID) {
    orderRecord.budget_classification_id = newOrder.budget_classification_id;
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
    } catch {}

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
      const { data } = await supabase
        .from('fuel_supply_orders')
        .select('*, vehicle:fleet_vehicles(*)')
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .single();
      if (data) {
        order = data as TwoWayFuelOrder;
      }
    } catch {}
  }

  if (!order) {
    throw new Error(`Ordem de fornecimento nº "${orderId}" não foi encontrada no sistema.`);
  }

  // Se já foi finalizada
  if (order.status === 'abastecido' || order.status === 'auditado') {
    throw new Error(`Esta autorização já foi liquidada anteriormente em ${new Date(order.supplied_at || order.created_at).toLocaleString('pt-BR')}.`);
  }

  // 2. Buscar veículo
  let vehicles = getLocalVehicles();
  let vehicle = vehicles.find(v => v.id === order!.vehicle_id) || order.vehicle;

  if (!vehicle) {
    try {
      const { data } = await supabase.from('fleet_vehicles').select('*').eq('id', order.vehicle_id).single();
      if (data) vehicle = data as FleetVehicle;
    } catch {}
  }

  if (!vehicle) {
    throw new Error('Veículo oficial vinculado à autorização não foi encontrado.');
  }

  const suppliedLiters = completionData.liters_supplied && completionData.liters_supplied > 0 
    ? completionData.liters_supplied 
    : order.liters_authorized;

  // 3. Execução dos cálculos e motor antifraude
  const audit = calculateRealtimeMetrics(
    order.previous_odometer,
    completionData.current_odometer,
    suppliedLiters,
    vehicle.expected_consumption,
    vehicle.tank_capacity
  );

  // 4. Determina status de liquidação
  let finalStatus: TwoWayOrderStatus = 'abastecido';
  if (audit.anomaly_level === 'bloqueio_critico') {
    finalStatus = 'glosado'; // Bloqueado para liquidação contábil
  }

  // 5. Atualiza a ordem
  const updatedDriverName = completionData.driver_name?.trim() || order.driver_name;
  if (completionData.vehicle_plate && completionData.vehicle_plate.trim() && vehicle) {
    vehicle.plate = completionData.vehicle_plate.trim().toUpperCase();
  }

  const updatedOrder: TwoWayFuelOrder = {
    ...order,
    vehicle,
    driver_name: updatedDriverName,
    liters_supplied: suppliedLiters,
    current_odometer: completionData.current_odometer,
    calculated_km_per_liter: audit.calculated_km_per_liter,
    deviation_percent: audit.deviation_percent,
    receipt_photo_url: completionData.receipt_photo_url || order.receipt_photo_url,
    odometer_photo_url: completionData.odometer_photo_url || order.odometer_photo_url,
    pump_photo_url: completionData.pump_photo_url || order.pump_photo_url,
    total_authorized_value: order.supply_mode === 'encher_tanque' ? Number((suppliedLiters * order.bidded_unit_price).toFixed(2)) : order.total_authorized_value,
    invoice_coupon_number: completionData.invoice_coupon_number?.trim() || order.invoice_coupon_number,
    anomaly_level: audit.anomaly_level,
    anomaly_reason: audit.anomaly_reason,
    audit_justification: completionData.audit_justification || order.audit_justification,
    status: finalStatus,
    supplied_at: completionData.supplied_at || new Date().toISOString()
  };

  // 6. Se NÃO houve bloqueio crítico, atualiza o odômetro do veículo na frota
  if (audit.anomaly_level !== 'bloqueio_critico') {
    vehicle.current_odometer = completionData.current_odometer;
    try {
      await supabase
        .from('fleet_vehicles')
        .update({ 
          current_odometer: completionData.current_odometer,
          plate: vehicle.plate
        })
        .eq('id', vehicle.id);
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

  // 7. Persistir a atualização da ordem no Supabase
  try {
    await supabase.from('fuel_supply_orders').update({
      driver_name: updatedOrder.driver_name,
      liters_supplied: updatedOrder.liters_supplied,
      current_odometer: updatedOrder.current_odometer,
      calculated_km_per_liter: updatedOrder.calculated_km_per_liter,
      deviation_percent: updatedOrder.deviation_percent,
      receipt_photo_url: updatedOrder.receipt_photo_url,
      odometer_photo_url: updatedOrder.odometer_photo_url,
      pump_photo_url: updatedOrder.pump_photo_url,
      total_authorized_value: updatedOrder.total_authorized_value,
      invoice_coupon_number: updatedOrder.invoice_coupon_number,
      anomaly_level: updatedOrder.anomaly_level,
      anomaly_reason: updatedOrder.anomaly_reason,
      audit_justification: updatedOrder.audit_justification,
      status: updatedOrder.status,
      supplied_at: updatedOrder.supplied_at
    }).eq('id', updatedOrder.id);
  } catch (err) {
    console.warn('[FleetFuelAudit] Erro ao atualizar ordem no Supabase:', err);
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
  } catch {}
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

  // 1. CONSULTA DIRETA NO SUPABASE (Fonte Única da Verdade)
  try {
    let query = supabase.from('fuel_supply_orders').select('*, vehicle:fleet_vehicles(*)');
    if (isUUID) {
      query = query.or(`id.eq.${clean},order_number.ilike.${clean}`);
    } else {
      query = query.or(`order_number.ilike.${clean},order_number.ilike.%${clean}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (!error) {
      if (data) {
        if (data.anomaly_reason === 'CANCELADO_EXCLUIDO' || data.status === 'cancelado') {
          removeLocalOrderByIdentifier(clean);
          return null;
        }
        return data as TwoWayFuelOrder;
      } else {
        // Se a busca com join retornou vazio, tenta busca direta simples sem join
        let simpleQuery = supabase.from('fuel_supply_orders').select('*');
        if (isUUID) {
          simpleQuery = simpleQuery.eq('id', clean);
        } else {
          simpleQuery = simpleQuery.or(`order_number.ilike.${clean},order_number.ilike.%${clean}%`);
        }

        const { data: rawOrder, error: simpleErr } = await simpleQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();

        if (!simpleErr) {
          if (rawOrder) {
            if (rawOrder.anomaly_reason === 'CANCELADO_EXCLUIDO' || rawOrder.status === 'cancelado') {
              removeLocalOrderByIdentifier(clean);
              return null;
            }
            const orderObj = rawOrder as TwoWayFuelOrder;
            if (orderObj.vehicle_id) {
              try {
                const { data: vData } = await supabase.from('fleet_vehicles').select('*').eq('id', orderObj.vehicle_id).maybeSingle();
                if (vData) orderObj.vehicle = vData as FleetVehicle;
              } catch {}
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
async function compressFuelPhoto(file: File): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const MAX_DIM = 1280;
    let width = bitmap.width;
    let height = bitmap.height;

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
    ctx?.drawImage(bitmap, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
          resolve(compressed);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', 0.82);
    });
  } catch {
    return file;
  }
}

/**
 * Upload de comprovante físico (canhoto assinado, foto da bomba ou foto do odômetro)
 */
export async function uploadFuelDocumentPhoto(file: File, folder: 'receipts' | 'odometers' | 'pumps' | 'invoices'): Promise<string> {
  const processedFile = await compressFuelPhoto(file);
  const fileExt = processedFile.name.split('.').pop() || 'jpg';
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, processedFile, { cacheControl: '3600', upsert: true });

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('[FleetFuelAudit] Falha no upload no bucket, utilizando Base64 seguro:', err);
  }

  // Fallback seguro em Base64
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

