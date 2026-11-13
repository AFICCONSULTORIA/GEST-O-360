/**
 * Módulo de Controle e Auditoria de Abastecimento de Frotas
 * Camada de API, Serviços e Motor de Validação Antifraude com DADOS REAIS
 * Em conformidade com o Tribunal de Contas do Estado (TCE) e Lei Federal 4.320/64
 */

import { supabase, supabaseAnon } from '../supabase';

export type FuelType = 'gasolina' | 'etanol' | 'diesel_s10' | 'diesel_s500' | 'arla32';
export type MetricType = 'km' | 'horimetro';
export type FuelOrderStatus = 'autorizado_pendente' | 'autorizado' | 'aguardando_abastecimento' | 'abastecido' | 'auditado' | 'glosado' | 'liquidado';

export interface FleetBudgetClassification {
  id: string;
  institution_id: string;
  department_local: string; // Ex: 'Gabinete', 'Transporte Escolar', 'PSF', 'TFD'
  invoice_sheet: string;    // Ficha orçamentária (ex: '11', '57', '152')
  funding_source: string;   // Fonte de recursos (ex: '1.1.500.0', '2.1.500.1001000')
  budget_code?: string;     // Código da dotação (ex: '18', '20', '28')
  is_active?: boolean;
  created_at?: string;
}

export interface FleetVehicle {
  id: string;
  institution_id: string;
  plate: string;
  prefix_code?: string;
  model: string;
  department: string;
  fuel_type: FuelType;
  tank_capacity: number; // Litros
  metric_type: MetricType; // 'km' ou 'horimetro'
  expected_consumption: number; // km/l de referência
  current_odometer: number;
  status: 'ativo' | 'manutencao' | 'baixado' | 'inativo';
  is_emergency_priority?: boolean; // Prioridade de Prontidão (Ambulâncias, Ônibus Escolar, Resgate)
  budget_classification_id?: string;
  budget_classification?: FleetBudgetClassification;
  always_full_tank?: boolean; // Sempre autorizar no regime de encher o tanque (Top-Off)
  created_at: string;
}

export interface FuelSupplyOrder {
  id: string;
  institution_id: string;
  order_number: string; // "ABAST-2026-0001"
  vehicle_id: string;
  vehicle?: FleetVehicle;
  driver_name: string;
  driver_document?: string;
  station_name: string;
  fuel_type: FuelType;
  liters_authorized: number;
  liters_supplied?: number;
  current_odometer: number;
  previous_odometer: number;
  calculated_consumption?: number; // km/l apurado
  unit_price?: number;
  total_value?: number;
  invoice_number?: string;
  invoice_key?: string; // 44 dígitos da NF-e / NFC-e

  // Modalidade de Fornecimento
  supply_mode?: 'litragem_fixa' | 'encher_tanque';
  authorized_by_name?: string;
  authorized_by_role?: string;
  budget_classification_id?: string;
  budget_classification?: FleetBudgetClassification;

  // Prontidão e Urgência (Tanque Cheio)
  is_full_tank_order?: boolean; // Regime de Prontidão Operacional
  emergency_call_reason?: string; // Motivo do Plantão / Chamado de Urgência
  tank_residual_expected?: number; // Litros estimados gastos com base na KM rodada

  // Comprovação documental
  receipt_attachment_url?: string; // Foto/scan do canhoto assinado
  receipt_photo_url?: string; // Foto do canhoto físico assinado
  odometer_photo_url?: string; // Foto do painel do veículo
  pump_photo_url?: string; // Foto do visor da bomba (litros e valor)
  invoice_attachment_url?: string; // Foto/PDF da nota fiscal
  invoice_coupon_number?: string;

  // Parâmetros Licitatórios e Auditoria em Duas Vias
  bidded_unit_price?: number;
  total_authorized_value?: number;
  calculated_km_per_liter?: number;
  deviation_percent?: number;
  anomaly_level?: 'none' | 'alerta_amarelo' | 'bloqueio_critico';
  supplied_at?: string;

  // Auditoria e Motor Antifraude
  is_anomaly: boolean;
  anomaly_reason?: string;
  audit_justification?: string;
  audited_by?: string;
  status: FuelOrderStatus;
  created_at: string;
  updated_at: string;
}

export interface NewFuelOrderPayload {
  vehicle_id: string;
  driver_name: string;
  driver_document?: string;
  station_name: string;
  fuel_type: FuelType;
  liters_authorized: number;
  supply_mode?: 'litragem_fixa' | 'encher_tanque';
  authorized_by_name?: string;
  authorized_by_role?: string;
  institution_id?: string;
  is_full_tank_order?: boolean;
  emergency_call_reason?: string;
}

export interface FuelExecutionPayload {
  liters_supplied: number;
  current_odometer: number;
  unit_price: number;
  invoice_number?: string;
  invoice_key?: string;
  receipt_attachment_url?: string;
  odometer_photo_url?: string;
  invoice_attachment_url?: string;
}

export interface FleetDriver {
  id: string;
  institution_id: string;
  full_name: string;
  cpf?: string;
  birth_date?: string;
  department: string;
  cnh_number?: string;
  cnh_category?: string;
  status: 'ativo' | 'inativo' | 'afastado';
  created_at: string;
  updated_at?: string;
}

export interface NewDriverPayload {
  id?: string;
  institution_id?: string;
  full_name: string;
  cpf?: string;
  birth_date?: string;
  department: string;
  cnh_number?: string;
  cnh_category?: string;
  status?: 'ativo' | 'inativo' | 'afastado';
}

export interface FleetFuelStation {
  id: string;
  institution_id: string;
  name: string;
  cnpj?: string;
  address?: string;
  city?: string;
  phone?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at?: string;
}

export interface NewStationPayload {
  id?: string;
  institution_id?: string;
  name: string;
  cnpj?: string;
  address?: string;
  city?: string;
  phone?: string;
  status?: 'ativo' | 'inativo';
}

const STORAGE_KEY_VEHICLES = 'gestao360_real_vehicles';
const STORAGE_KEY_ORDERS = 'gestao360_real_orders';
const STORAGE_KEY_DRIVERS = 'gestao360_real_drivers';
const STORAGE_KEY_STATIONS = 'gestao360_real_stations';
const STORAGE_KEY_CLEARED = 'gestao360_fleet_cleared';
const STORAGE_KEY_DRIVERS_CLEARED = 'gestao360_drivers_cleared';
const BUCKET_NAME = 'certidoes'; // Utiliza o bucket ativo do sistema para anexos de comprovantes

function isRlsError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { code?: string; status?: number; message?: string };
  return (
    anyErr.code === '42501' ||
    anyErr.status === 403 ||
    (typeof anyErr.message === 'string' && anyErr.message.includes('row-level security'))
  );
}

// Limpeza de chaves mock legadas e expurgo definitivo do cache antigo de motoristas e postos
const STORAGE_KEY_DRIVERS_PURGE = 'gestao360_drivers_purged_v1';
const STORAGE_KEY_STATIONS_PURGE = 'gestao360_stations_purged_v1';
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('gestao360_fleet_vehicles');
    localStorage.removeItem('gestao360_fuel_supply_orders');
    if (!localStorage.getItem(STORAGE_KEY_DRIVERS_PURGE)) {
      localStorage.removeItem(STORAGE_KEY_DRIVERS);
      localStorage.setItem(STORAGE_KEY_DRIVERS_PURGE, 'true');
      localStorage.setItem(STORAGE_KEY_DRIVERS_CLEARED, 'true');
    }
    if (!localStorage.getItem(STORAGE_KEY_STATIONS_PURGE)) {
      localStorage.removeItem(STORAGE_KEY_STATIONS);
      localStorage.setItem(STORAGE_KEY_STATIONS_PURGE, 'true');
      localStorage.setItem('gestao360_stations_cleared', 'true');
    }
  } catch {}
}

function getLocalRealVehicles(): FleetVehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VEHICLES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalRealVehicles(vehicles: FleetVehicle[]) {
  try {
    localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
  } catch {}
}

function getLocalDrivers(): FleetDriver[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRIVERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalDrivers(drivers: FleetDriver[]) {
  try {
    localStorage.setItem(STORAGE_KEY_DRIVERS, JSON.stringify(drivers));
  } catch {}
}

function getLocalStations(): FleetFuelStation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATIONS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalStations(stations: FleetFuelStation[]) {
  try {
    localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(stations));
  } catch {}
}

function getLocalRealOrders(): FuelSupplyOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalRealOrders(orders: FuelSupplyOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch {}
}

/**
 * SINCRONIZAÇÃO DA FROTA REAL A PARTIR DO CADASTRO PATRIMONIAL MUNICIPAL (public.patrimonio)
 * Importa os veículos reais com especificações técnicas e parâmetros de consumo do TCE.
 */
export async function syncVehiclesFromPatrimonio(institutionId: string = 'inst_1'): Promise<FleetVehicle[]> {
  try {
    let query = supabase.from('patrimonio').select('*').neq('plate', '');
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }
    const { data: patrimonioList, error } = await query;

    if (error || !patrimonioList || patrimonioList.length === 0) {
      console.warn('[FleetFuel] Nenhum veículo encontrado na tabela patrimonio ou erro:', error);
      return getLocalRealVehicles();
    }

    const newVehicles: FleetVehicle[] = [];
    const existingPlates = new Set<string>();

    for (const item of patrimonioList) {
      let rawPlate = (item.plate || '').toUpperCase().trim().replace(/[\s-]/g, '');
      if (!rawPlate || rawPlate === '0' || rawPlate.length < 5) continue;

      // Formatação padrão da placa
      let cleanPlate = rawPlate;
      if (cleanPlate.length === 7) {
        cleanPlate = `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`;
      }

      if (existingPlates.has(cleanPlate)) continue;
      existingPlates.add(cleanPlate);

      const nameAndModel = `${item.object_name || ''} ${item.model || ''} ${item.description || ''}`.toUpperCase();

      // Mapeamento Técnico de Combustível, Métrica e Capacidade de Tanque
      let fuelType: FuelType = 'gasolina';
      let metricType: MetricType = 'km';
      let tankCapacity = 55.0;
      let expectedConsumption = 11.0;
      let prefix = (item.code || '').trim() || undefined;

      if (
        nameAndModel.includes('RETROESCAVADEIRA') ||
        nameAndModel.includes('ESCAVADEIRA') ||
        nameAndModel.includes('CARREGADEIRA') ||
        nameAndModel.includes('MOTONIVELADORA') ||
        nameAndModel.includes('PC 130') ||
        nameAndModel.includes('LW300') ||
        nameAndModel.includes('GR1803')
      ) {
        fuelType = 'diesel_s500';
        metricType = 'horimetro';
        tankCapacity = 160.0;
        expectedConsumption = 8.0; // 8 l/h
      } else if (
        nameAndModel.includes('BASCULANTE') ||
        nameAndModel.includes('CAMINHÃO') ||
        nameAndModel.includes('CARGO') ||
        nameAndModel.includes('1622') ||
        nameAndModel.includes('1113') ||
        nameAndModel.includes('26.280') ||
        nameAndModel.includes('ATRN')
      ) {
        fuelType = 'diesel_s10';
        metricType = 'km';
        tankCapacity = 275.0;
        expectedConsumption = 3.2; // 3.2 km/l
      } else if (
        nameAndModel.includes('ÔNIBUS') ||
        nameAndModel.includes('ONIBUS') ||
        nameAndModel.includes('MICROONIBUS') ||
        nameAndModel.includes('VOLARE') ||
        nameAndModel.includes('VICINO') ||
        nameAndModel.includes('CITYCLASS')
      ) {
        fuelType = 'diesel_s10';
        metricType = 'km';
        tankCapacity = 150.0;
        expectedConsumption = 5.2; // 5.2 km/l
      } else if (
        nameAndModel.includes('AMBULANCIA') ||
        nameAndModel.includes('AMBULÂNCIA') ||
        nameAndModel.includes('MASTER') ||
        nameAndModel.includes('SPRINTER')
      ) {
        fuelType = 'diesel_s10';
        metricType = 'km';
        tankCapacity = 75.0;
        expectedConsumption = 9.5; // 9.5 km/l
      } else if (
        nameAndModel.includes('TRITON') ||
        nameAndModel.includes('RANGER') ||
        nameAndModel.includes('S10')
      ) {
        fuelType = 'diesel_s10';
        metricType = 'km';
        tankCapacity = 75.0;
        expectedConsumption = 10.0; // 10 km/l
      } else if (
        nameAndModel.includes('MOTO') ||
        nameAndModel.includes('BIZ') ||
        nameAndModel.includes('BROS')
      ) {
        fuelType = 'gasolina';
        metricType = 'km';
        tankCapacity = 12.0;
        expectedConsumption = 35.0; // 35 km/l
      } else {
        // Veículos leves (Uno, Gol, Cronos, Spin, Strada)
        fuelType = 'gasolina';
        metricType = 'km';
        tankCapacity = 50.0;
        expectedConsumption = 11.5; // 11.5 km/l
      }

      const isEmergencyPriority = 
        nameAndModel.includes('AMBUL') ||
        nameAndModel.includes('SAMU') ||
        nameAndModel.includes('RESGATE') ||
        nameAndModel.includes('ONIBUS') ||
        nameAndModel.includes('ÔNIBUS') ||
        nameAndModel.includes('MICRO') ||
        (item.department ? (item.department.toLowerCase().includes('saúde') || item.department.toLowerCase().includes('saude')) : false);

      const vehicleObj: FleetVehicle = {
        id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `veh-${Date.now()}`),
        institution_id: item.institution_id || institutionId,
        plate: cleanPlate,
        prefix_code: prefix,
        model: `${item.object_name ? item.object_name.trim() : ''} ${item.model ? `(${item.model.trim()})` : ''}`.trim(),
        department: item.department || 'Administração Geral',
        fuel_type: fuelType,
        tank_capacity: tankCapacity,
        metric_type: metricType,
        expected_consumption: expectedConsumption,
        current_odometer: 0,
        status: 'ativo',
        is_emergency_priority: isEmergencyPriority,
        created_at: item.created_at || new Date().toISOString()
      };

      newVehicles.push(vehicleObj);
    }

    // Tentar persistir na tabela fleet_vehicles do Supabase
    if (newVehicles.length > 0) {
      try {
        await supabase.from('fleet_vehicles').upsert(
          newVehicles.map(v => ({
            id: v.id,
            institution_id: v.institution_id,
            plate: v.plate,
            prefix_code: v.prefix_code,
            model: v.model,
            department: v.department,
            fuel_type: v.fuel_type,
            tank_capacity: v.tank_capacity,
            metric_type: v.metric_type,
            expected_consumption: v.expected_consumption,
            current_odometer: v.current_odometer,
            status: v.status,
            is_emergency_priority: v.is_emergency_priority
          })),
          { onConflict: 'plate' }
        );
      } catch (err) {
        console.warn('[FleetFuel] Nota sobre gravação no banco Supabase:', err);
      }

      saveLocalRealVehicles(newVehicles);
      return newVehicles;
    }
  } catch (err) {
    console.error('[FleetFuel] Erro na sincronização com patrimonio:', err);
  }

  return getLocalRealVehicles();
}

/**
 * 1. getFleetVehicles: Consulta veículos reais ativos
 */
export async function getFleetVehicles(department?: string, institutionId: string = 'inst_1'): Promise<FleetVehicle[]> {
  const isCleared = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_CLEARED) === 'true';
  let remoteList: FleetVehicle[] | null = null;

  try {
    let query = supabase.from('fleet_vehicles').select('*');
    if (institutionId && institutionId !== 'all') {
      query = query.or(`institution_id.eq.${institutionId},institution_id.eq.inst_1,institution_id.eq.default`);
    }
    if (department && department !== 'all') {
      query = query.eq('department', department);
    }
    let { data, error } = await query.order('plate', { ascending: true });
    if (error && isRlsError(error)) {
      let anonQuery = supabaseAnon.from('fleet_vehicles').select('*');
      if (institutionId && institutionId !== 'all') {
        anonQuery = anonQuery.or(`institution_id.eq.${institutionId},institution_id.eq.inst_1,institution_id.eq.default`);
      }
      if (department && department !== 'all') {
        anonQuery = anonQuery.eq('department', department);
      }
      const anonRes = await anonQuery.order('plate', { ascending: true });
      data = anonRes.data;
      error = anonRes.error;
    }

    if (!error && data) {
      remoteList = data as FleetVehicle[];
    } else if (error) {
      console.warn('[FleetFuel] Falha ao consultar fleet_vehicles no Supabase:', error);
    }
  } catch (err) {
    console.warn('[FleetFuel] Exceção ao consultar fleet_vehicles no Supabase:', err);
  }

  if (remoteList !== null) {
    if (isCleared && remoteList.length === 0) {
      saveLocalRealVehicles([]);
      return [];
    }
    saveLocalRealVehicles(remoteList);
    let result = remoteList;
    if (department && department !== 'all') {
      result = result.filter(v => v.department === department);
    }
    return result;
  }

  // Fallback offline
  if (isCleared) {
    return [];
  }
  const localList = getLocalRealVehicles();
  if (localList.length > 0) {
    if (department && department !== 'all') {
      return localList.filter(v => v.department === department);
    }
    return localList;
  }

  // Se a tabela fleet_vehicles estiver vazia e não tiver sido limpa pelo usuário, sincroniza com patrimonio
  const synced = await syncVehiclesFromPatrimonio(institutionId);
  if (department && department !== 'all') {
    return synced.filter(v => v.department === department);
  }
  return synced;
}

/**
 * Cadastrar novo veículo real na frota com sanitização estrita de UUIDs e tratamento de RLS
 */
export async function createFleetVehicle(vehicleData: Omit<FleetVehicle, 'id' | 'created_at'>): Promise<FleetVehicle> {
  const validId = generateValidUUID();
  const rawPlate = vehicleData.plate.toUpperCase().trim();
  const validBudgetId = vehicleData.budget_classification_id ? toBudgetUUID(vehicleData.budget_classification_id) : null;

  const newVehicle: FleetVehicle = {
    ...vehicleData,
    id: validId,
    plate: rawPlate,
    budget_classification_id: validBudgetId || undefined,
    created_at: new Date().toISOString()
  };

  const supabaseRecord = {
    id: validId,
    institution_id: vehicleData.institution_id || 'inst_1',
    plate: rawPlate,
    prefix_code: vehicleData.prefix_code && vehicleData.prefix_code.trim() !== '' ? vehicleData.prefix_code.toUpperCase().trim() : null,
    model: vehicleData.model.trim(),
    department: vehicleData.department ? vehicleData.department.trim() : 'Geral',
    fuel_type: vehicleData.fuel_type,
    tank_capacity: Number(vehicleData.tank_capacity) || 50,
    metric_type: vehicleData.metric_type || 'km',
    expected_consumption: Number(vehicleData.expected_consumption) || 8.0,
    current_odometer: Number(vehicleData.current_odometer || 0),
    status: vehicleData.status || 'ativo',
    is_emergency_priority: Boolean(vehicleData.is_emergency_priority),
    budget_classification_id: validBudgetId,
    always_full_tank: Boolean(vehicleData.always_full_tank)
  };

  try {
    let { data, error } = await supabase.from('fleet_vehicles').insert([supabaseRecord]).select().single();
    if (error && isRlsError(error)) {
      const retry = await supabaseAnon.from('fleet_vehicles').insert([supabaseRecord]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      const list = getLocalRealVehicles();
      const existingIdx = list.findIndex(v => v.id === validId || v.plate === rawPlate);
      if (existingIdx !== -1) {
        list[existingIdx] = data as FleetVehicle;
      } else {
        list.unshift(data as FleetVehicle);
      }
      saveLocalRealVehicles(list);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem(STORAGE_KEY_CLEARED); } catch {}
      }
      return data as FleetVehicle;
    } else if (error) {
      console.error('[FleetFuel] Erro ao gravar veículo no Supabase:', error);
      throw new Error(`Falha ao registrar veículo no Supabase: ${error.message}`);
    }
  } catch (err: unknown) {
    console.error('[FleetFuel] Exceção ao gravar veículo no Supabase:', err);
    if (err instanceof Error && err.message.includes('Supabase:')) {
      throw err;
    }
    throw new Error(`Erro ao conectar com Supabase: ${err instanceof Error ? err.message : String(err)}`);
  }

  const list = getLocalRealVehicles();
  list.unshift(newVehicle);
  saveLocalRealVehicles(list);
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY_CLEARED); } catch {}
  }
  return newVehicle;
}

/**
 * Atualizar dados técnicos ou status do veículo no cadastro
 */
export async function updateFleetVehicle(id: string, updates: Partial<FleetVehicle>): Promise<FleetVehicle> {
  const validBudgetId = updates.budget_classification_id !== undefined
    ? (updates.budget_classification_id ? toBudgetUUID(updates.budget_classification_id) : null)
    : undefined;

  const supabaseRecord: Record<string, unknown> = {};
  if (updates.plate) supabaseRecord.plate = updates.plate.toUpperCase().trim();
  if (updates.prefix_code !== undefined) {
    supabaseRecord.prefix_code = updates.prefix_code && updates.prefix_code.trim() !== '' ? updates.prefix_code.toUpperCase().trim() : null;
  }
  if (updates.model) supabaseRecord.model = updates.model.trim();
  if (updates.department) supabaseRecord.department = updates.department.trim();
  if (updates.fuel_type) supabaseRecord.fuel_type = updates.fuel_type;
  if (updates.tank_capacity !== undefined) supabaseRecord.tank_capacity = Number(updates.tank_capacity);
  if (updates.metric_type) supabaseRecord.metric_type = updates.metric_type;
  if (updates.expected_consumption !== undefined) supabaseRecord.expected_consumption = Number(updates.expected_consumption);
  if (updates.current_odometer !== undefined) supabaseRecord.current_odometer = Number(updates.current_odometer);
  if (updates.status) supabaseRecord.status = updates.status;
  if (updates.is_emergency_priority !== undefined) supabaseRecord.is_emergency_priority = Boolean(updates.is_emergency_priority);
  if (updates.always_full_tank !== undefined) supabaseRecord.always_full_tank = Boolean(updates.always_full_tank);
  if (updates.budget_classification_id !== undefined) supabaseRecord.budget_classification_id = validBudgetId;

  if (isValidUUID(id)) {
    try {
      let { data, error } = await supabase.from('fleet_vehicles').update(supabaseRecord).eq('id', id).select().single();
      if (error && isRlsError(error)) {
        const retry = await supabaseAnon.from('fleet_vehicles').update(supabaseRecord).eq('id', id).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (!error && data) {
        const list = getLocalRealVehicles();
        const idx = list.findIndex(v => v.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...data };
          saveLocalRealVehicles(list);
        }
        return data as FleetVehicle;
      } else if (error) {
        console.error('[FleetFuel] Erro ao atualizar veículo no Supabase:', error);
        throw new Error(`Falha ao atualizar veículo no Supabase: ${error.message}`);
      }
    } catch (err) {
      console.warn('[FleetFuel] Erro ao atualizar veículo no Supabase:', err);
      if (err instanceof Error && err.message.includes('Supabase:')) {
        throw err;
      }
    }
  }

  const list = getLocalRealVehicles();
  const idx = list.findIndex(v => v.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    saveLocalRealVehicles(list);
    return list[idx];
  }
  throw new Error('Veículo não encontrado para atualização.');
}

/**
 * Excluir ou Baixar veículo da frota com proteção de integridade referencial do TCE
 */
export async function deleteFleetVehicle(id: string): Promise<{ deleted: boolean; baixado: boolean; message: string }> {
  // 1. Verificar se o veículo possui ordens de abastecimento vinculadas
  let hasOrders = false;
  try {
    const { data: orders, error } = await supabase
      .from('fuel_supply_orders')
      .select('id')
      .eq('vehicle_id', id)
      .limit(1);

    if (!error && orders && orders.length > 0) {
      hasOrders = true;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao verificar ordens vinculadas:', err);
  }

  // Se não foi detectado no Supabase, verificar também no cache local
  if (!hasOrders) {
    const localOrders = getLocalRealOrders();
    if (localOrders.some(o => o.vehicle_id === id)) {
      hasOrders = true;
    }
  }

  // 2. Se houver ordens, NÃO pode fazer exclusão física para resguardo fiscal do TCE -> Aplica Baixa Técnica
  if (hasOrders) {
    await updateFleetVehicle(id, { status: 'baixado' });
    return {
      deleted: false,
      baixado: true,
      message: 'Este veículo possui histórico de ordens de abastecimento registradas. Em cumprimento às normas de auditoria do Tribunal de Contas, o veículo foi marcado como "Baixado/Inativo" para preservação do histórico contábil.'
    };
  }

  // 3. Se NÃO houver ordens vinculadas, executa a exclusão física com segurança
  try {
    await supabase.from('fleet_vehicles').delete().eq('id', id);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao excluir veículo no Supabase:', err);
  }

  const list = getLocalRealVehicles();
  const filtered = list.filter(v => v.id !== id);
  saveLocalRealVehicles(filtered);

  return {
    deleted: true,
    baixado: false,
    message: 'Veículo excluído com sucesso da frota municipal.'
  };
}

/**
 * Excluir toda a frota municipal (limpeza total para recadastro do zero)
 */
export async function clearAllFleetVehicles(institutionId: string = 'inst_1'): Promise<{ success: boolean; count: number; message: string }> {
  const currentVehicles = getLocalRealVehicles();
  const count = currentVehicles.length;

  try {
    await supabase.from('fleet_vehicles').delete().eq('institution_id', institutionId);
  } catch (err) {
    console.warn('[FleetFuel] Aviso ao limpar frota no Supabase:', err);
  }

  saveLocalRealVehicles([]);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CLEARED, 'true');
    } catch {}
  }

  return {
    success: true,
    count,
    message: `Toda a frota foi excluída com sucesso (${count} veículos removidos). O cadastro está zerado para novas inserções.`
  };
}

/**
 * Listar ordens de abastecimento REAIS com filtros
 */
export async function getFuelSupplyOrders(filters?: {
  status?: string;
  department?: string;
  onlyAnomalies?: boolean;
  institutionId?: string;
}): Promise<FuelSupplyOrder[]> {
  try {
    const buildQuery = (client: any) => {
      let q = client.from('fuel_supply_orders').select(`
        *,
        vehicle:fleet_vehicles(*)
      `);
      if (filters?.institutionId) {
        q = q.or(`institution_id.eq.${filters.institutionId},institution_id.eq.inst_1,institution_id.eq.default,institution_id.is.null`);
      }
      if (filters?.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters?.onlyAnomalies) {
        q = q.eq('is_anomaly', true);
      }
      return q.order('created_at', { ascending: false });
    };

    let { data, error } = await buildQuery(supabase);
    if (error) {
      console.warn('[FleetFuel] Erro com cliente padrão ao buscar ordens, tentando com supabaseAnon:', error);
      const retryAnon = await buildQuery(supabaseAnon);
      if (!retryAnon.error && retryAnon.data) {
        data = retryAnon.data;
        error = null;
      }
    }

    if (!error && data) {
      // Carregar em paralelo mapa de dotações/fichas e o catálogo de fichas orçamentárias da nuvem
      const [remoteBudgetMap, allBudgets] = await Promise.all([
        getFuelOrderBudgetsFromSupabase(filters?.institutionId || 'inst_1'),
        getFleetBudgetClassifications(filters?.institutionId || 'inst_1')
      ]);
      const localOrders = getLocalRealOrders();
      const normalized = (data as FuelSupplyOrder[]).map(ord => {
        const cached = localOrders.find(lo => lo.id === ord.id || lo.order_number === ord.order_number);
        const resolvedBudgetId = ord.budget_classification_id ||
          remoteBudgetMap[ord.id] ||
          remoteBudgetMap[ord.order_number] ||
          cached?.budget_classification_id;

        const resolvedBc = ord.budget_classification ||
          cached?.budget_classification ||
          allBudgets.find(b => b.id === resolvedBudgetId || b.invoice_sheet === resolvedBudgetId || b.id === toBudgetUUID(String(resolvedBudgetId))) ||
          allBudgets.find(b => b.id === cached?.budget_classification_id || b.invoice_sheet === cached?.budget_classification_id || b.id === toBudgetUUID(String(cached?.budget_classification_id)));

        return {
          ...ord,
          budget_classification_id: resolvedBudgetId || resolvedBc?.id,
          budget_classification: resolvedBc,
          receipt_attachment_url: ord.receipt_attachment_url || ord.receipt_photo_url || cached?.receipt_attachment_url || cached?.receipt_photo_url,
          receipt_photo_url: ord.receipt_photo_url || ord.receipt_attachment_url || cached?.receipt_photo_url || cached?.receipt_attachment_url
        };
      });
      saveLocalRealOrders(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('[FleetFuel] Falha ao consultar ordens no Supabase, usando cache real:', err);
  }

  // Fallback para ordens reais gravadas localmente
  const vehicles = getLocalRealVehicles();
  const localBudgets = getLocalBudgetClassifications();
  let orders = getLocalRealOrders().map(order => {
    const vehicle = vehicles.find(v => v.id === order.vehicle_id);
    const resolvedBc = order.budget_classification ||
      localBudgets.find(b => b.id === order.budget_classification_id || b.invoice_sheet === order.budget_classification_id || b.id === toBudgetUUID(String(order.budget_classification_id))) ||
      localBudgets.find(b => b.id === vehicle?.budget_classification_id || b.invoice_sheet === vehicle?.budget_classification_id || b.id === toBudgetUUID(String(vehicle?.budget_classification_id))) ||
      vehicle?.budget_classification;

    return { 
      ...order, 
      vehicle: order.vehicle || vehicle,
      budget_classification: resolvedBc,
      budget_classification_id: resolvedBc?.id || order.budget_classification_id,
      receipt_attachment_url: order.receipt_attachment_url || order.receipt_photo_url,
      receipt_photo_url: order.receipt_photo_url || order.receipt_attachment_url
    };
  });

  if (filters?.status && filters.status !== 'all') {
    orders = orders.filter(o => o.status === filters.status);
  }
  if (filters?.onlyAnomalies) {
    orders = orders.filter(o => o.is_anomaly);
  }
  if (filters?.department && filters.department !== 'all') {
    orders = orders.filter(o => o.vehicle?.department === filters.department);
  }

  return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export const STORAGE_KEY_FUEL_MAX_SEQ = (prefix: string, year: number) => `gestao360_max_fuel_seq_${prefix}_${year}`;

/**
 * Formata um número de ordem no padrão oficial municipal de 7 dígitos (ex: 22464 -> "0022464")
 */
export function formatOrderNumber7Digits(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  // Se for puramente numérico (com ou sem zeros à esquerda)
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    if (!isNaN(num)) {
      return String(num).padStart(7, '0');
    }
  }
  return str.toUpperCase();
}

const BASE_ORDER_SEQ_7DIGITS = 22463; // Ponto de partida fixado pelo município (próximo inicial: 0022464)

/**
 * Obtém o próximo número de ordem livre na sequência oficial padrão de 7 dígitos.
 * Consulta exclusivamente as ordens ativas (sem incrementar contadores locais a cada leitura),
 * retomando automaticamente a numeração quando uma ordem é excluída e preenchendo eventuais lacunas.
 */
export async function getNextOrderNumber7Digits(): Promise<string> {
  // Limpa contador legado em localStorage que causava saltos na numeração ao abrir/cancelar modais
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fleet_fuel_max_seq_7digits');
    }
  } catch {}

  const usedNumbers = new Set<number>();
  let remoteResponded = false;

  // 1. Consulta as ordens ativas no Supabase (Fonte Única da Verdade)
  try {
    let { data, error } = await supabase
      .from('fuel_supply_orders')
      .select('order_number, anomaly_reason')
      .limit(2000);

    if (error && isRlsError(error)) {
      const retry = await supabaseAnon
        .from('fuel_supply_orders')
        .select('order_number, anomaly_reason')
        .limit(2000);
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      remoteResponded = true;
      for (const row of data) {
        if (row.anomaly_reason === 'CANCELADO_EXCLUIDO') continue;
        if (row.order_number) {
          const clean = String(row.order_number).trim();
          if (/^\d+$/.test(clean)) {
            const num = parseInt(clean, 10);
            if (!isNaN(num)) {
              usedNumbers.add(num);
            }
          }
        }
      }
    } else if (error) {
      console.warn('[FleetFuel] Aviso ao consultar sequência de ordens de 7 dígitos no Supabase:', error);
    }
  } catch (err) {
    console.warn('[FleetFuel] Aviso ao consultar sequência de ordens de 7 dígitos no Supabase:', err);
  }

  // 2. Fallback offline: usa o cache local ativo somente se o Supabase não respondeu
  if (!remoteResponded) {
    try {
      const localOrders = getLocalRealOrders();
      for (const ord of localOrders) {
        if (ord.anomaly_reason === 'CANCELADO_EXCLUIDO') continue;
        if (ord.order_number) {
          const clean = ord.order_number.trim();
          if (/^\d+$/.test(clean)) {
            const num = parseInt(clean, 10);
            if (!isNaN(num)) {
              usedNumbers.add(num);
            }
          }
        }
      }
    } catch {}
  }

  // Encontra o primeiro número livre na sequência contínua a partir de 0022464
  let candidate = BASE_ORDER_SEQ_7DIGITS + 1;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }

  return String(candidate).padStart(7, '0');
}

/**
 * Obtém o próximo número sequencial de autorização para o ano corrente de forma estritamente crescente.
 * Mesmo se uma ordem anterior for excluída, a numeração nunca retrocede ou colide.
 */
export async function getNextFuelOrderSequence(prefix: string = 'AUT', year: number = new Date().getFullYear()): Promise<number> {
  let maxSeq = 0;

  // 1. Contador persistente salvo no localStorage
  try {
    const rawSaved = localStorage.getItem(STORAGE_KEY_FUEL_MAX_SEQ(prefix, year));
    if (rawSaved) {
      const parsed = parseInt(rawSaved, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  } catch {}

  // 2. Extrai o maior número já existente em ordens locais
  const localOrders = getLocalRealOrders();
  for (const ord of localOrders) {
    if (ord.order_number && ord.order_number.startsWith(`${prefix}-${year}-`)) {
      const parts = ord.order_number.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  // 3. Consulta o Supabase para verificar o maior número já emitido no banco
  try {
    const { data } = await supabase
      .from('fuel_supply_orders')
      .select('order_number')
      .ilike('order_number', `${prefix}-${year}-%`)
      .order('order_number', { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      for (const row of data) {
        if (row.order_number) {
          const parts = row.order_number.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[FleetFuel] Aviso ao consultar maior sequencial no Supabase:', err);
  }

  const nextSeq = maxSeq + 1;
  // Atualiza imediatamente o contador persistente
  try {
    localStorage.setItem(STORAGE_KEY_FUEL_MAX_SEQ(prefix, year), String(nextSeq));
  } catch {}

  return nextSeq;
}

/**
 * 2. createFuelOrder: Emissão de Ordem Real com validação bloqueante de capacidade de tanque
 */
export async function createFuelOrder(orderData: NewFuelOrderPayload): Promise<FuelSupplyOrder> {
  const vehicles = await getFleetVehicles(undefined, orderData.institution_id || 'inst_1');
  const vehicle = vehicles.find(v => v.id === orderData.vehicle_id);

  if (!vehicle) {
    throw new Error('Veículo informado não foi localizado no cadastro da frota municipal.');
  }

  // VALIDAÇÃO BLOQUEANTE: Litragem autorizada não pode exceder o tanque físico
  if (orderData.liters_authorized > vehicle.tank_capacity) {
    throw new Error(
      `BLOQUEIO DE AUDITORIA: A litragem autorizada (${orderData.liters_authorized.toFixed(2)}L) excede a capacidade física máxima do tanque do veículo (${vehicle.tank_capacity.toFixed(2)}L - ${vehicle.model}).`
    );
  }

  if (orderData.liters_authorized <= 0) {
    throw new Error('A litragem autorizada deve ser maior que zero.');
  }

  // Gera número sequencial oficial padrão de 7 dígitos contínuo ("0022464")
  const orderNumber = await getNextOrderNumber7Digits();

  const newOrder: FuelSupplyOrder = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`,
    institution_id: orderData.institution_id || vehicle.institution_id || 'inst_1',
    order_number: orderNumber,
    vehicle_id: vehicle.id,
    vehicle: vehicle,
    driver_name: orderData.driver_name.trim(),
    driver_document: orderData.driver_document?.trim() || undefined,
    station_name: orderData.station_name.trim(),
    fuel_type: orderData.fuel_type,
    liters_authorized: Number(orderData.liters_authorized),
    previous_odometer: Number(vehicle.current_odometer || 0),
    current_odometer: Number(vehicle.current_odometer || 0),
    is_full_tank_order: !!orderData.is_full_tank_order,
    emergency_call_reason: orderData.emergency_call_reason?.trim() || undefined,
    is_anomaly: false,
    status: 'autorizado',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('fuel_supply_orders').insert([{
      id: newOrder.id,
      institution_id: newOrder.institution_id,
      order_number: newOrder.order_number,
      vehicle_id: newOrder.vehicle_id,
      driver_name: newOrder.driver_name,
      driver_document: newOrder.driver_document,
      station_name: newOrder.station_name,
      fuel_type: newOrder.fuel_type,
      liters_authorized: newOrder.liters_authorized,
      previous_odometer: newOrder.previous_odometer,
      current_odometer: newOrder.current_odometer,
      is_full_tank_order: newOrder.is_full_tank_order,
      emergency_call_reason: newOrder.emergency_call_reason,
      is_anomaly: false,
      status: 'autorizado'
    }]).select().single();

    if (!error && data) {
      const orders = getLocalRealOrders();
      orders.unshift({ ...newOrder, ...data, vehicle });
      saveLocalRealOrders(orders);
      return { ...newOrder, ...data, vehicle };
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao gravar ordem no Supabase, salvando localmente:', err);
  }

  const orders = getLocalRealOrders();
  orders.unshift(newOrder);
  saveLocalRealOrders(orders);
  return newOrder;
}

/**
 * 3. registerFuelExecution: Registro de execução com motor de cálculo e detecção de anomalias
 */
export async function registerFuelExecution(
  orderId: string,
  executionData: FuelExecutionPayload
): Promise<FuelSupplyOrder> {
  const orders = getLocalRealOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);

  if (orderIndex === -1) {
    throw new Error('Ordem de abastecimento não encontrada.');
  }

  const order = orders[orderIndex];
  const vehicles = await getFleetVehicles(undefined, order.institution_id);
  const vehicle = vehicles.find(v => v.id === order.vehicle_id) || order.vehicle;

  if (!vehicle) {
    throw new Error('Veículo associado à ordem não foi localizado no cadastro.');
  }

  const litersSupplied = Number(executionData.liters_supplied);
  const currentOdometer = Number(executionData.current_odometer);
  const previousOdometer = Number(order.previous_odometer);
  const unitPrice = Number(executionData.unit_price);
  const totalValue = Number((litersSupplied * unitPrice).toFixed(2));

  if (litersSupplied <= 0) {
    throw new Error('A litragem real abastecida deve ser maior que zero.');
  }

  // 1. Cálculo de consumo e expectativa de reposição (para Prontidão / Tanque Cheio)
  const deltaOdometer = currentOdometer - previousOdometer;
  let calculatedConsumption: number = 0;
  let expectedLitersForRefill: number = 0;

  if (deltaOdometer > 0 && litersSupplied > 0) {
    calculatedConsumption = Number((deltaOdometer / litersSupplied).toFixed(2));
  }

  if (vehicle.expected_consumption > 0 && deltaOdometer > 0) {
    if (vehicle.metric_type === 'horimetro') {
      expectedLitersForRefill = Number((deltaOdometer * vehicle.expected_consumption).toFixed(2));
    } else {
      expectedLitersForRefill = Number((deltaOdometer / vehicle.expected_consumption).toFixed(2));
    }
  }

  const tankResidualExpected = vehicle.tank_capacity > expectedLitersForRefill
    ? Number((vehicle.tank_capacity - expectedLitersForRefill).toFixed(2))
    : 0;

  // 2. MOTOR DE VALIDAÇÃO DE ANOMALIAS E ANTIFRAUDE
  const anomalies: string[] = [];

  // Regra A: Odômetro/Horímetro regressivo ou sem variação
  if (previousOdometer > 0 && currentOdometer <= previousOdometer) {
    anomalies.push(
      `Odômetro/Horímetro regressivo ou sem variação: Informado ${currentOdometer} ${vehicle.metric_type}, anterior era ${previousOdometer} ${vehicle.metric_type}.`
    );
  }

  // Regra B: Litragem superior à capacidade física do tanque
  if (litersSupplied > vehicle.tank_capacity) {
    anomalies.push(
      `Litragem abastecida (${litersSupplied.toFixed(2)}L) excede a capacidade física do tanque (${vehicle.tank_capacity.toFixed(2)}L). Suspeita de abastecimento externo/galão.`
    );
  }

  // Regra C: Litragem abastecida maior que a litragem autorizada
  if (litersSupplied > order.liters_authorized) {
    anomalies.push(
      `Litragem abastecida (${litersSupplied.toFixed(2)}L) superou o limite autorizado na Ordem (${order.liters_authorized.toFixed(2)}L).`
    );
  }

  // Regra D: Desvio de consumo médio superior a 20%
  if (calculatedConsumption > 0 && vehicle.expected_consumption > 0) {
    const deviation = Math.abs(calculatedConsumption - vehicle.expected_consumption) / vehicle.expected_consumption;
    if (deviation > 0.20) {
      const percentage = (deviation * 100).toFixed(1);
      const direction = calculatedConsumption < vehicle.expected_consumption ? 'Consumo excessivo' : 'Rendimento atípico';
      anomalies.push(
        `${direction}: Desvio de ${percentage}% em relação à média esperada (${calculatedConsumption} vs ${vehicle.expected_consumption} ${vehicle.metric_type === 'km' ? 'km/l' : 'l/h'}).`
      );
    }
  }

  // Regra E: Antifraude em Regime de Prontidão (Tanque Cheio de Ambulâncias / Ônibus)
  // Verifica se o volume faturado é desproporcional à KM percorrida desde a última completagem
  const isEmergencyOrFullTank = order.is_full_tank_order || vehicle.is_emergency_priority;
  if (isEmergencyOrFullTank && deltaOdometer > 0 && expectedLitersForRefill > 0) {
    // Margem de tolerância de 30% para marcha lenta, ar-condicionado de UTI/ambulância e trânsito
    const maxAllowedLiters = expectedLitersForRefill * 1.30;
    const excessLiters = litersSupplied - maxAllowedLiters;
    if (litersSupplied > maxAllowedLiters && excessLiters > 8.0) {
      anomalies.push(
        `ALERTA DE DESVIO EM COMPLETAGEM (PRONTIDÃO/URGÊNCIA): O veículo percorreu ${deltaOdometer} ${vehicle.metric_type}. Consumo esperado de ~${expectedLitersForRefill.toFixed(1)}L (+ margem de 30% = ${maxAllowedLiters.toFixed(1)}L), mas foram faturados ${litersSupplied.toFixed(1)}L (+${(litersSupplied - expectedLitersForRefill).toFixed(1)}L de excesso físico). Suspeita de desvio para recipiente externo ou outro veículo.`
      );
    }
  }

  // Regra F: Odômetro Estagnado / Baixa Rodagem com Faturamento Alto
  if (deltaOdometer < 15 && litersSupplied > 10.0) {
    anomalies.push(
      `ALERTA DE ODÔMETRO ESTAGNADO: Abastecimento de ${litersSupplied.toFixed(1)}L para deslocamento de apenas ${deltaOdometer} ${vehicle.metric_type}. Requer justificativa de operação com motor estacionário ou manutenção técnica.`
    );
  }

  const isAnomaly = anomalies.length > 0;
  const anomalyReason = isAnomaly ? anomalies.join(' | ') : undefined;

  const updatedOrder: FuelSupplyOrder = {
    ...order,
    liters_supplied: litersSupplied,
    current_odometer: currentOdometer,
    calculated_consumption: calculatedConsumption,
    tank_residual_expected: tankResidualExpected,
    unit_price: unitPrice,
    total_value: totalValue,
    invoice_number: executionData.invoice_number?.trim() || order.invoice_number,
    invoice_key: executionData.invoice_key?.trim() || order.invoice_key,
    receipt_attachment_url: executionData.receipt_attachment_url || order.receipt_attachment_url,
    odometer_photo_url: executionData.odometer_photo_url || order.odometer_photo_url,
    invoice_attachment_url: executionData.invoice_attachment_url || order.invoice_attachment_url,
    is_anomaly: isAnomaly,
    anomaly_reason: anomalyReason,
    status: 'abastecido',
    updated_at: new Date().toISOString()
  };

  // Atualizar odômetro do veículo no cadastro técnico se for superior
  if (currentOdometer > vehicle.current_odometer) {
    await updateFleetVehicle(vehicle.id, { current_odometer: currentOdometer });
  }

  // Gravar no Supabase
  try {
    await supabase.from('fuel_supply_orders').update({
      liters_supplied: updatedOrder.liters_supplied,
      current_odometer: updatedOrder.current_odometer,
      calculated_consumption: updatedOrder.calculated_consumption,
      tank_residual_expected: updatedOrder.tank_residual_expected,
      unit_price: updatedOrder.unit_price,
      total_value: updatedOrder.total_value,
      invoice_number: updatedOrder.invoice_number,
      invoice_key: updatedOrder.invoice_key,
      receipt_attachment_url: updatedOrder.receipt_attachment_url,
      odometer_photo_url: updatedOrder.odometer_photo_url,
      invoice_attachment_url: updatedOrder.invoice_attachment_url,
      is_anomaly: updatedOrder.is_anomaly,
      anomaly_reason: updatedOrder.anomaly_reason,
      status: updatedOrder.status,
      updated_at: updatedOrder.updated_at
    }).eq('id', orderId);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao atualizar execução no Supabase:', err);
  }

  orders[orderIndex] = updatedOrder;
  saveLocalRealOrders(orders);
  return updatedOrder;
}

/**
 * 4. uploadReceiptAttachment: Upload de comprovante
 */
export async function uploadReceiptAttachment(
  orderId: string,
  file: File,
  type: 'receipt' | 'odometer' | 'invoice' | 'pump'
): Promise<string> {
  const fieldMap: Record<string, string> = {
    receipt: 'receipt_attachment_url',
    odometer: 'odometer_photo_url',
    invoice: 'invoice_attachment_url',
    pump: 'pump_photo_url'
  };
  const targetField = fieldMap[type] || 'pump_photo_url';
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const cleanFileName = `canhotos/${orderId}_${type}_${Date.now()}.${ext}`;
  const contentType = file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg');

  const persistUrlToOrder = async (finalUrl: string) => {
    const dbUpdate: Record<string, string> = { [targetField]: finalUrl };
    if (type === 'receipt') {
      dbUpdate.receipt_photo_url = finalUrl;
    }

    try {
      const res = await supabase.from('fuel_supply_orders').update(dbUpdate).eq('id', orderId).select();
      if (res.error || !res.data || res.data.length === 0) {
        await supabaseAnon.from('fuel_supply_orders').update(dbUpdate).eq('id', orderId);
      }
    } catch {
      try {
        await supabaseAnon.from('fuel_supply_orders').update(dbUpdate).eq('id', orderId);
      } catch {}
    }

    const orders = getLocalRealOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      (orders[idx] as any)[targetField] = finalUrl;
      if (type === 'receipt') {
        orders[idx].receipt_photo_url = finalUrl;
      }
      saveLocalRealOrders(orders);
    }
  };

  for (const targetBucket of ['fleet-fuel-receipts', BUCKET_NAME]) {
    try {
      let uploadRes = await supabase.storage
        .from(targetBucket)
        .upload(cleanFileName, file, { contentType, upsert: true });

      if (uploadRes.error) {
        uploadRes = await supabaseAnon.storage
          .from(targetBucket)
          .upload(cleanFileName, file, { contentType, upsert: true });
      }

      if (!uploadRes.error && uploadRes.data) {
        const { data: publicUrlData } = supabaseAnon.storage
          .from(targetBucket)
          .getPublicUrl(cleanFileName);

        const publicUrl = publicUrlData.publicUrl;
        await persistUrlToOrder(publicUrl);
        return publicUrl;
      }
    } catch (err) {
      console.warn(`[FleetFuel] Aviso no upload para ${targetBucket}:`, err);
    }
  }

  // Fallback DataURL persistido também no Supabase
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await persistUrlToOrder(dataUrl);
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 5. auditFuelOrder: Homologação para liquidação ou glosa preventiva do controle interno
 */
export async function auditFuelOrder(
  orderId: string,
  status: 'auditado' | 'glosado',
  justification?: string,
  auditorId?: string
): Promise<FuelSupplyOrder> {
  const orders = getLocalRealOrders();
  const index = orders.findIndex(o => o.id === orderId);

  if (index === -1) {
    throw new Error('Ordem de abastecimento não encontrada.');
  }

  const order = orders[index];
  const updatedOrder: FuelSupplyOrder = {
    ...order,
    status: status,
    audit_justification: justification?.trim() || order.audit_justification,
    audited_by: auditorId || order.audited_by,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('fuel_supply_orders').update({
      status: updatedOrder.status,
      audit_justification: updatedOrder.audit_justification,
      audited_by: updatedOrder.audited_by,
      updated_at: updatedOrder.updated_at
    }).eq('id', orderId);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao auditar ordem no Supabase:', err);
  }

  orders[index] = updatedOrder;
  saveLocalRealOrders(orders);
  return updatedOrder;
}

/**
 * 5.0.1 clearFuelOrderFraudRisk: Permite ao responsável pela frota retirar manualmente
 * o apontamento de Risco de Fraude mediante observação explicativa obrigatória.
 */
export async function clearFuelOrderFraudRisk(
  orderId: string,
  observation: string,
  clearedBy?: string
): Promise<FuelSupplyOrder> {
  const cleanObs = observation.trim();
  if (!cleanObs) {
    throw new Error('Informe uma observação explicando a situação para retirar o Risco de Fraude.');
  }

  const orders = getLocalRealOrders();
  const index = orders.findIndex(o => o.id === orderId || o.order_number === orderId);

  if (index === -1) {
    throw new Error('Ordem de abastecimento não encontrada.');
  }

  const order = orders[index];
  const nowIso = new Date().toISOString();
  const auditNote = `[Risco de Fraude retirado manualmente${clearedBy ? ` por ${clearedBy}` : ''}]: ${cleanObs}`;
  const updatedJustification = order.audit_justification
    ? `${order.audit_justification}\n${auditNote}`
    : auditNote;

  const updatedOrder: FuelSupplyOrder = {
    ...order,
    is_anomaly: false,
    anomaly_level: 'none',
    anomaly_reason: undefined,
    audit_justification: updatedJustification,
    updated_at: nowIso
  };

  try {
    await supabase.from('fuel_supply_orders').update({
      is_anomaly: false,
      anomaly_level: 'none',
      anomaly_reason: null,
      audit_justification: updatedOrder.audit_justification,
      updated_at: updatedOrder.updated_at
    }).eq('id', order.id);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao retirar Risco de Fraude no Supabase:', err);
  }

  orders[index] = updatedOrder;
  saveLocalRealOrders(orders);
  return updatedOrder;
}

/**
 * 5.1 cancelFuelOrderHomologation: Cancela a homologação ou glosa de uma ordem,
 * reabrindo-a no status 'abastecido' para permitir correções de odômetro, litragem ou notas.
 */
export async function cancelFuelOrderHomologation(
  orderId: string,
  reason?: string,
  _canceledBy?: string
): Promise<FuelSupplyOrder> {
  const orders = getLocalRealOrders();
  const index = orders.findIndex(o => o.id === orderId || o.order_number === orderId);

  if (index === -1) {
    throw new Error('Ordem de abastecimento não encontrada.');
  }

  const order = orders[index];
  const targetStatus = (order.liters_supplied || order.current_odometer || order.pump_photo_url || order.receipt_photo_url)
    ? 'abastecido'
    : 'autorizado';

  const nowIso = new Date().toISOString();
  const updatedOrder: FuelSupplyOrder = {
    ...order,
    status: targetStatus,
    audit_justification: reason ? `[Homologação desfeita]: ${reason}` : undefined,
    audited_by: undefined,
    updated_at: nowIso
  };

  try {
    const updatePayload = {
      status: targetStatus,
      audit_justification: updatedOrder.audit_justification || null,
      audited_by: null,
      updated_at: nowIso
    };

    let query = supabase.from('fuel_supply_orders').update(updatePayload);
    if (isValidUUID(orderId)) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }
    const { error } = await query;

    if (error) {
      let anonQuery = supabaseAnon.from('fuel_supply_orders').update(updatePayload);
      if (isValidUUID(orderId)) {
        anonQuery = anonQuery.eq('id', orderId);
      } else {
        anonQuery = anonQuery.eq('order_number', orderId);
      }
      await anonQuery;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao cancelar homologação no Supabase:', err);
  }

  orders[index] = updatedOrder;
  saveLocalRealOrders(orders);

  // Notificar canais em tempo real
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gestao360_fuel_order_updated', {
      detail: { orderId: updatedOrder.id, orderNumber: updatedOrder.order_number, order: updatedOrder }
    }));
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('gestao360_fleet_channel');
        bc.postMessage({ type: 'ORDER_HOMOLOGATION_CANCELED', order: updatedOrder });
        bc.close();
      } catch {}
    }
  }

  return updatedOrder;
}

/**
 * 6. deleteFuelSupplyOrder: Excluir ordem/auditoria de abastecimento (Acesso Administrativo)
 * Nota: A exclusão de uma ordem remove definitivamente do banco de dados (via RPC e DELETE),
 * aplica soft-delete preventivo contra bloqueios de RLS e mantém o contador sequencial contínuo
 * para garantir que cada nova ordem gerada receba um número inédito.
 */
export async function deleteFuelSupplyOrder(orderIdOrNumber: string, orderNumberFallback?: string): Promise<boolean> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderIdOrNumber);

  // 1. Tenta RPC com SECURITY DEFINER (exclusão forçada no PostgreSQL contornando RLS)
  try {
    await supabase.rpc('rpc_delete_fuel_order', {
      p_order_id_or_number: orderIdOrNumber
    });
    if (orderNumberFallback) {
      await supabase.rpc('rpc_delete_fuel_order', {
        p_order_id_or_number: orderNumberFallback
      });
    }
  } catch (e) {}

  // 2. Tenta exclusão física direta via API REST (com fallback anon)
  try {
    if (isUuid) {
      await supabase.from('fuel_supply_orders').delete().eq('id', orderIdOrNumber);
      await supabaseAnon.from('fuel_supply_orders').delete().eq('id', orderIdOrNumber);
    }
    await supabase.from('fuel_supply_orders').delete().eq('order_number', orderIdOrNumber);
    await supabaseAnon.from('fuel_supply_orders').delete().eq('order_number', orderIdOrNumber);
    if (orderNumberFallback) {
      await supabase.from('fuel_supply_orders').delete().eq('order_number', orderNumberFallback);
      await supabaseAnon.from('fuel_supply_orders').delete().eq('order_number', orderNumberFallback);
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao excluir ordem no Supabase:', err);
  }

  // 3. Salvaguarda imediata: caso o DELETE tenha sido retido por FK/RLS,
  // aplicamos soft-delete liberando o order_number original para retomada da sequência.
  try {
    const filters: string[] = [];
    if (isUuid) filters.push(`id.eq.${orderIdOrNumber}`);
    filters.push(`order_number.eq.${orderIdOrNumber}`);
    if (orderNumberFallback) filters.push(`order_number.eq.${orderNumberFallback}`);

    await supabase.from('fuel_supply_orders').update({
      order_number: `DEL-${Date.now()}-${orderNumberFallback || orderIdOrNumber}`,
      status: 'glosado',
      anomaly_reason: 'CANCELADO_EXCLUIDO',
      is_anomaly: true,
      audit_justification: 'Autorização cancelada e excluída pelo gestor da frota.'
    }).or(filters.join(','));
  } catch (errSoft) {
    console.warn('[FleetFuel] Aviso ao aplicar cancelamento da ordem no banco:', errSoft);
  }

  // 4. Limpeza do cache local e contador sequencial legado
  const orders = getLocalRealOrders();
  const filtered = orders.filter(o => 
    o.id !== orderIdOrNumber && 
    o.order_number !== orderIdOrNumber &&
    (!orderNumberFallback || o.order_number !== orderNumberFallback)
  );
  saveLocalRealOrders(filtered);
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fleet_fuel_max_seq_7digits');
    }
  } catch {}

  // 5. Broadcast de evento para atualizar outras telas e modais
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestao360_fuel_order_deleted', {
        detail: { orderId: orderIdOrNumber, orderNumber: orderNumberFallback }
      }));
    }
  } catch (e) {}

  return true;
}

/**
 * 7. clearAllFuelOrders: Limpar todo o histórico de ordens/auditorias (Acesso Administrativo)
 * Exclui todos os registros do banco de dados remoto e reinicia o contador sequencial anual.
 */
export async function clearAllFuelOrders(institutionId?: string, resetSequence: boolean = true): Promise<boolean> {
  // 1. Tenta RPC com SECURITY DEFINER
  try {
    const { error: rpcError } = await supabase.rpc('rpc_clear_all_fuel_orders');
    if (!rpcError) {
      console.log('[FleetFuel] Todas as ordens limpas no Supabase via RPC com sucesso');
    }
  } catch (e) {}

  // 2. Tenta DELETE direto
  try {
    if (institutionId) {
      await supabase.from('fuel_supply_orders').delete().eq('institution_id', institutionId);
    }
    // Remove todas as ordens de teste para garantir limpeza total
    await supabase.from('fuel_supply_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err) {
    console.warn('[FleetFuel] Erro ao limpar histórico de ordens no Supabase:', err);
  }

  // 3. Salvaguarda imediata: UPDATE para invalidar qualquer registro caso o DELETE direto tenha sofrido bloqueio
  try {
    await supabase.from('fuel_supply_orders').update({
      status: 'glosado',
      anomaly_reason: 'CANCELADO_EXCLUIDO',
      is_anomaly: true,
      audit_justification: 'Histórico de ordens de teste limpo pelo gestor.'
    }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {}

  saveLocalRealOrders([]);

  if (resetSequence) {
    const currentYear = new Date().getFullYear();
    try {
      localStorage.removeItem('fleet_fuel_max_seq_7digits');
      localStorage.removeItem(STORAGE_KEY_FUEL_MAX_SEQ('AUT', currentYear));
      localStorage.removeItem(STORAGE_KEY_FUEL_MAX_SEQ('ABAST', currentYear));
      localStorage.setItem(STORAGE_KEY_FUEL_MAX_SEQ('AUT', currentYear), '0');
      localStorage.setItem(STORAGE_KEY_FUEL_MAX_SEQ('ABAST', currentYear), '0');
    } catch {}
  }
  return true;
}

/**
 * ====================================================================
 * GESTÃO DE MOTORISTAS / CONDUTORES OFICIAIS (fleet_drivers)
 * ====================================================================
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isValidUUID(id?: string): boolean {
  return !!id && UUID_REGEX.test(id);
}

export function toBudgetUUID(sheetOrId?: string): string {
  if (!sheetOrId) return '00000000-0000-4000-8000-000000000011';
  if (isValidUUID(sheetOrId)) return sheetOrId;
  const num = parseInt(sheetOrId.replace(/[^0-9]/g, ''), 10) || 11;
  return `00000000-0000-4000-8000-${String(num).padStart(12, '0')}`;
}

export function generateValidUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sanitiza qualquer formato de data (DD/MM/YYYY, YYYY-MM-DD, serial Excel ou timestamp)
 * para o formato estrito ISO 'YYYY-MM-DD' aceito pelo tipo DATE do PostgreSQL/Supabase.
 */
export function sanitizeDateToISO(dateVal?: string | number | null): string | null {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  // 1. Já está no formato ISO 'YYYY-MM-DD'
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. Formato brasileiro 'DD/MM/YYYY' ou 'DD-MM-YYYY'
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Formato 'YYYY/MM/DD'
  const revMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (revMatch) {
    const year = revMatch[1];
    const month = revMatch[2].padStart(2, '0');
    const day = revMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 4. Serial numérico do Excel (ex: 31278)
  const num = Number(str);
  if (!isNaN(num) && num > 1000 && num < 60000) {
    try {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {}
  }

  // 5. Tentativa genérica com Date.parse
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}

  return null;
}

/**
 * Garante que um condutor/motorista esteja salvo de forma 100% automática no Supabase (fleet_drivers).
 * Usado na emissão de ordem, baixa pelo QR Code e formulários, para que o motorista nunca precise
 * de sincronização manual para existir no banco remoto.
 */
export async function ensureDriverExistsInSupabase(driver: {
  full_name: string;
  cpf?: string;
  department?: string;
  institution_id?: string;
}): Promise<FleetDriver | null> {
  const name = driver.full_name?.trim();
  if (!name || name.length < 2) return null;

  const rawCpf = driver.cpf || '';
  const cleanCpf = rawCpf.replace(/\D/g, '');
  const hasValidCpf = isRealCpf(rawCpf);
  const formattedCpf = hasValidCpf
    ? `${cleanCpf.slice(0,3)}.${cleanCpf.slice(3,6)}.${cleanCpf.slice(6,9)}-${cleanCpf.slice(9,11)}`
    : rawCpf.trim();
  const institutionId = driver.institution_id || 'inst_1';
  const department = driver.department?.trim() || 'Frota Municipal';

  try {
    // 1. Verifica se já existe por CPF real ou Nome (nunca cruza CPF genérico 000.000.000-00)
    const safeNameForOr = name.replace(/["\\]/g, '');
    let query = supabase.from('fleet_drivers').select('*');
    if (hasValidCpf) {
      query = query.or(`cpf.eq.${formattedCpf},full_name.ilike."${safeNameForOr}"`);
    } else {
      query = query.ilike('full_name', name);
    }

    let { data: existing, error: findErr } = await query.limit(1).maybeSingle();
    if (findErr && isRlsError(findErr)) {
      let anonQuery = supabaseAnon.from('fleet_drivers').select('*');
      if (hasValidCpf) {
        anonQuery = anonQuery.or(`cpf.eq.${formattedCpf},full_name.ilike."${safeNameForOr}"`);
      } else {
        anonQuery = anonQuery.ilike('full_name', name);
      }
      const anonRes = await anonQuery.limit(1).maybeSingle();
      existing = anonRes.data;
    }

    if (existing) {
      if (existing.department === TOMBSTONE_MARKER) {
        return null;
      }
      return existing as FleetDriver;
    }

    // Não recria automaticamente se estiver na blacklist explícita de excluídos
    if (isDriverBlacklisted({ full_name: name, cpf: hasValidCpf ? formattedCpf : undefined })) {
      return null;
    }

    // 2. Insere novo condutor diretamente no Supabase e atualiza cache local
    const newId = generateValidUUID();
    const supabaseRecord = {
      id: newId,
      institution_id: institutionId,
      full_name: name,
      cpf: formattedCpf,
      department,
      status: 'ativo'
    };

    let { data: inserted, error: insertErr } = await supabase
      .from('fleet_drivers')
      .upsert([supabaseRecord], { onConflict: 'id' })
      .select()
      .single();

    if (insertErr && isRlsError(insertErr)) {
      const retry = await supabaseAnon
        .from('fleet_drivers')
        .upsert([supabaseRecord], { onConflict: 'id' })
        .select()
        .single();
      inserted = retry.data;
      insertErr = retry.error;
    }

    if (!insertErr && inserted) {
      const created = inserted as FleetDriver;
      const list = getLocalDrivers().filter(d => !isDriverTombstoned(d) && d.id !== created.id);
      list.unshift(created);
      saveLocalDrivers(list);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem(STORAGE_KEY_DRIVERS_CLEARED); } catch {}
      }
      return created;
    }
  } catch (err) {
    console.warn('[FleetFuel] Aviso ao auto-salvar motorista:', err);
  }

  return null;
}

const TOMBSTONE_MARKER = '__EXCLUIDO__';
const STORAGE_KEY_STATIONS_BLACKLIST = 'gestao360_stations_deleted_blacklist';
const STORAGE_KEY_DRIVERS_BLACKLIST = 'gestao360_drivers_deleted_blacklist';

function getDeletedStationBlacklist(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_STATIONS_BLACKLIST) : null;
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function addStationToBlacklist(id?: string, name?: string, cnpj?: string) {
  try {
    if (typeof window === 'undefined') return;
    const set = getDeletedStationBlacklist();
    if (id) set.add(id.toLowerCase());
    if (name) set.add(name.toLowerCase().trim());
    if (cnpj) {
      set.add(cnpj.trim());
      set.add(cnpj.replace(/\D/g, ''));
    }
    localStorage.setItem(STORAGE_KEY_STATIONS_BLACKLIST, JSON.stringify(Array.from(set)));
  } catch {}
}

function removeStationFromBlacklist(id?: string, name?: string, cnpj?: string) {
  try {
    if (typeof window === 'undefined') return;
    const set = getDeletedStationBlacklist();
    if (id) set.delete(id.toLowerCase());
    if (name) set.delete(name.toLowerCase().trim());
    if (cnpj) {
      set.delete(cnpj.trim());
      set.delete(cnpj.replace(/\D/g, ''));
    }
    localStorage.setItem(STORAGE_KEY_STATIONS_BLACKLIST, JSON.stringify(Array.from(set)));
  } catch {}
}

function isStationBlacklisted(s?: Partial<FleetFuelStation> | null): boolean {
  if (!s) return false;
  const set = getDeletedStationBlacklist();
  if (s.id && set.has(s.id.toLowerCase())) return true;
  if (s.name && set.has(s.name.toLowerCase().trim())) return true;
  if (s.cnpj) {
    if (set.has(s.cnpj.trim())) return true;
    if (set.has(s.cnpj.replace(/\D/g, ''))) return true;
  }
  return false;
}

function isRealCpf(cpf?: string | null): boolean {
  if (!cpf) return false;
  const digits = cpf.replace(/\D/g, '');
  return digits.length === 11 && !/^0+$/.test(digits);
}

function getDeletedDriverBlacklist(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DRIVERS_BLACKLIST) : null;
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      return new Set(
        parsed.filter(entry => {
          if (!entry || entry.trim() === '') return false;
          const digitsOnly = entry.replace(/\D/g, '');
          // Nunca bloqueia CPF zerado/placeholder (000.000.000-00 / 00000000000)
          if (digitsOnly.length > 0 && digitsOnly.length === entry.replace(/[\s.\-]/g, '').length && /^0+$/.test(digitsOnly)) {
            return false;
          }
          return true;
        })
      );
    }
  } catch {}
  return new Set();
}

function addDriverToBlacklist(id?: string, cpf?: string, name?: string) {
  try {
    if (typeof window === 'undefined') return;
    const set = getDeletedDriverBlacklist();
    if (id) set.add(id.toLowerCase());
    if (cpf && isRealCpf(cpf)) {
      set.add(cpf.trim());
      set.add(cpf.replace(/\D/g, ''));
    }
    if (name && name.trim()) set.add(name.toLowerCase().trim());
    localStorage.setItem(STORAGE_KEY_DRIVERS_BLACKLIST, JSON.stringify(Array.from(set)));
  } catch {}
}

function removeDriverFromBlacklist(id?: string, cpf?: string, name?: string) {
  try {
    if (typeof window === 'undefined') return;
    const set = getDeletedDriverBlacklist();
    if (id) set.delete(id.toLowerCase());
    if (cpf && isRealCpf(cpf)) {
      set.delete(cpf.trim());
      set.delete(cpf.replace(/\D/g, ''));
    }
    if (name && name.trim()) {
      set.delete(name.toLowerCase().trim());
    }
    localStorage.setItem(STORAGE_KEY_DRIVERS_BLACKLIST, JSON.stringify(Array.from(set)));
  } catch {}
}

function isDriverBlacklisted(d?: Partial<FleetDriver> | null): boolean {
  if (!d) return false;
  const set = getDeletedDriverBlacklist();
  if (d.id && set.has(d.id.toLowerCase())) return true;
  if (d.cpf && isRealCpf(d.cpf)) {
    if (set.has(d.cpf.trim())) return true;
    if (set.has(d.cpf.replace(/\D/g, ''))) return true;
  }
  if (d.full_name && set.has(d.full_name.toLowerCase().trim())) return true;
  return false;
}

function isDriverTombstoned(d?: Partial<FleetDriver> | null): boolean {
  if (!d) return true;
  if (d.department === TOMBSTONE_MARKER || d.cnh_number === TOMBSTONE_MARKER) return true;
  if (d.status === 'inativo') return true;
  if (typeof d.full_name === 'string' && (d.full_name.includes(TOMBSTONE_MARKER) || d.full_name.startsWith('[EXCLUIDO]'))) return true;
  if (isDriverBlacklisted(d)) return true;
  return false;
}

function isStationTombstoned(s?: Partial<FleetFuelStation> | null): boolean {
  if (!s) return true;
  if (s.address === TOMBSTONE_MARKER || s.phone === TOMBSTONE_MARKER || s.city === TOMBSTONE_MARKER) return true;
  if (s.status === 'inativo') return true;
  if (typeof s.name === 'string' && (s.name.includes(TOMBSTONE_MARKER) || s.name.startsWith('[EXCLUIDO]'))) return true;
  if (isStationBlacklisted(s)) return true;
  return false;
}

export async function getFleetDrivers(filters?: {
  institutionId?: string;
  search?: string;
  department?: string;
}): Promise<FleetDriver[]> {
  const isCleared = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_DRIVERS_CLEARED) === 'true';
  let remoteList: FleetDriver[] | null = null;

  try {
    let query = supabase.from('fleet_drivers').select('*');
    if (filters?.institutionId && filters.institutionId !== 'all') {
      query = query.or(`institution_id.eq.${filters.institutionId},institution_id.eq.inst_1,institution_id.eq.default`);
    }
    if (filters?.department && filters.department !== 'all') {
      query = query.eq('department', filters.department);
    }
    let { data, error } = await query.order('full_name', { ascending: true });
    if (error && isRlsError(error)) {
      let anonQuery = supabaseAnon.from('fleet_drivers').select('*');
      if (filters?.institutionId && filters.institutionId !== 'all') {
        anonQuery = anonQuery.or(`institution_id.eq.${filters.institutionId},institution_id.eq.inst_1,institution_id.eq.default`);
      }
      if (filters?.department && filters.department !== 'all') {
        anonQuery = anonQuery.eq('department', filters.department);
      }
      const anonRes = await anonQuery.order('full_name', { ascending: true });
      data = anonRes.data;
      error = anonRes.error;
    }

    if (!error && data) {
      remoteList = (data as FleetDriver[]).filter(d => !isDriverTombstoned(d));
    } else if (error) {
      console.warn('[FleetFuel] Erro ao consultar motoristas no Supabase:', error);
    }
  } catch (err) {
    console.warn('[FleetFuel] Exceção ao consultar motoristas no Supabase:', err);
  }

  // Se a consulta remota ao Supabase respondeu, ela é a Fonte Única da Verdade!
  if (remoteList !== null) {
    saveLocalDrivers(remoteList);
    let result = remoteList;
    if (filters?.department && filters.department !== 'all') {
      result = result.filter(d => d.department === filters.department);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(d => d.full_name.toLowerCase().includes(q) || (d.cpf && d.cpf.includes(q)));
    }
    return result.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  // Fallback offline (apenas se estiver sem conexão com a internet)
  if (isCleared) {
    return [];
  }
  const localList = getLocalDrivers().filter(d => !isDriverTombstoned(d));
  let result = localList;
  if (filters?.department && filters.department !== 'all') {
    result = result.filter(d => d.department === filters.department);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(d => d.full_name.toLowerCase().includes(q) || (d.cpf && d.cpf.includes(q)));
  }
  return result.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function createFleetDriver(payload: NewDriverPayload): Promise<FleetDriver> {
  let driverId = isValidUUID(payload.id) ? payload.id! : generateValidUUID();
  const rawCpf = (payload.cpf || '').trim();
  const digitsCpf = rawCpf.replace(/\D/g, '');
  const hasValidCpf = isRealCpf(rawCpf);
  const fullNameTrimmed = payload.full_name.trim();

  // Se já existir registro no Supabase com o mesmo CPF real (nunca CPF zerado 000.000.000-00)
  // ou exatamente o mesmo nome (quando sem CPF real), reutiliza o UUID para reativar sem duplicar ou sobrescrever terceiros
  try {
    if (hasValidCpf) {
      const cpfFilters: string[] = [];
      if (rawCpf) cpfFilters.push(`cpf.eq.${rawCpf}`);
      if (digitsCpf && digitsCpf !== rawCpf) cpfFilters.push(`cpf.eq.${digitsCpf}`);
      if (cpfFilters.length > 0) {
        let { data: existing, error: exErr } = await supabase.from('fleet_drivers').select('id').or(cpfFilters.join(',')).limit(1).maybeSingle();
        if (exErr && isRlsError(exErr)) {
          const anonEx = await supabaseAnon.from('fleet_drivers').select('id').or(cpfFilters.join(',')).limit(1).maybeSingle();
          existing = anonEx.data;
        }
        if (existing?.id) {
          driverId = existing.id;
        }
      }
    } else if (fullNameTrimmed && !isValidUUID(payload.id)) {
      let { data: existingByName, error: nameErr } = await supabase
        .from('fleet_drivers')
        .select('id')
        .eq('institution_id', payload.institution_id || 'inst_1')
        .ilike('full_name', fullNameTrimmed)
        .limit(1)
        .maybeSingle();
      if (nameErr && isRlsError(nameErr)) {
        const anonName = await supabaseAnon
          .from('fleet_drivers')
          .select('id')
          .eq('institution_id', payload.institution_id || 'inst_1')
          .ilike('full_name', fullNameTrimmed)
          .limit(1)
          .maybeSingle();
        existingByName = anonName.data;
      }
      if (existingByName?.id) {
        driverId = existingByName.id;
      }
    }
  } catch {}

  const birthDate = sanitizeDateToISO(payload.birth_date);
  const cnhNumber = payload.cnh_number && payload.cnh_number.trim() !== '' ? payload.cnh_number.trim() : null;
  const cnhCat = payload.cnh_category && payload.cnh_category.trim() !== '' ? payload.cnh_category.trim() : null;
  const persistedCpf = rawCpf;

  const newDriver: FleetDriver = {
    id: driverId,
    institution_id: payload.institution_id || 'inst_1',
    full_name: fullNameTrimmed,
    cpf: persistedCpf,
    birth_date: birthDate || undefined,
    department: payload.department?.trim() || 'Geral',
    cnh_number: cnhNumber || undefined,
    cnh_category: cnhCat || undefined,
    status: (payload.status === 'inativo' || payload.status === 'afastado') ? payload.status : 'ativo',
    created_at: new Date().toISOString()
  };

  const supabaseRecord = {
    id: driverId,
    institution_id: payload.institution_id || 'inst_1',
    full_name: fullNameTrimmed,
    cpf: persistedCpf,
    birth_date: birthDate,
    department: payload.department?.trim() || 'Geral',
    cnh_number: cnhNumber,
    cnh_category: cnhCat,
    status: (payload.status === 'inativo' || payload.status === 'afastado') ? payload.status : 'ativo'
  };

  try {
    let { data, error } = await supabase.from('fleet_drivers').upsert([supabaseRecord], { onConflict: 'id' }).select().single();
    if (error && isRlsError(error)) {
      const retry = await supabaseAnon.from('fleet_drivers').upsert([supabaseRecord], { onConflict: 'id' }).select().single();
      data = retry.data;
      error = retry.error;
    }
    if (!error && data) {
      removeDriverFromBlacklist(driverId, persistedCpf, fullNameTrimmed);
      const list = getLocalDrivers().filter(d => !isDriverTombstoned(d));
      const existingIdx = list.findIndex(d => d.id === driverId || (hasValidCpf && d.cpf === newDriver.cpf));
      if (existingIdx !== -1) {
        list[existingIdx] = data as FleetDriver;
      } else {
        list.unshift(data as FleetDriver);
      }
      saveLocalDrivers(list);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem(STORAGE_KEY_DRIVERS_CLEARED); } catch {}
      }
      return data as FleetDriver;
    } else if (error) {
      console.error('[FleetFuel] Erro ao gravar motorista no Supabase:', error);
      throw new Error(`Falha ao registrar motorista na nuvem Supabase: ${error.message}`);
    }
  } catch (err: unknown) {
    console.error('[FleetFuel] Exceção ao gravar motorista no Supabase:', err);
    if (err instanceof Error && err.message.includes('Supabase:')) {
      throw err;
    }
    throw new Error(`Erro ao conectar com Supabase: ${err instanceof Error ? err.message : String(err)}`);
  }

  removeDriverFromBlacklist(driverId, persistedCpf, fullNameTrimmed);
  const list = getLocalDrivers().filter(d => !isDriverTombstoned(d));
  list.unshift(newDriver);
  saveLocalDrivers(list);
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY_DRIVERS_CLEARED); } catch {}
  }
  return newDriver;
}

export async function updateFleetDriver(id: string, updates: Partial<FleetDriver>): Promise<FleetDriver> {
  const birthDate = updates.birth_date && updates.birth_date.trim() !== '' ? updates.birth_date.trim() : null;
  const cnhNumber = updates.cnh_number && updates.cnh_number.trim() !== '' ? updates.cnh_number.trim() : null;
  const cnhCat = updates.cnh_category && updates.cnh_category.trim() !== '' ? updates.cnh_category.trim() : null;

  const supabaseRecord: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };
  if (updates.full_name) supabaseRecord.full_name = updates.full_name.trim();
  if (updates.cpf !== undefined) supabaseRecord.cpf = updates.cpf.trim();
  if (updates.birth_date !== undefined) supabaseRecord.birth_date = birthDate;
  if (updates.department) supabaseRecord.department = updates.department.trim();
  if (updates.cnh_number !== undefined) supabaseRecord.cnh_number = cnhNumber;
  if (updates.cnh_category !== undefined) supabaseRecord.cnh_category = cnhCat;
  if (updates.status) supabaseRecord.status = updates.status;

  if (isValidUUID(id)) {
    try {
      let { data, error } = await supabase.from('fleet_drivers').update(supabaseRecord).eq('id', id).select().single();
      if (error && isRlsError(error)) {
        const retry = await supabaseAnon.from('fleet_drivers').update(supabaseRecord).eq('id', id).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (!error && data) {
        const updated = data as FleetDriver;
        removeDriverFromBlacklist(id, updated.cpf, updated.full_name);
        const list = getLocalDrivers().filter(d => !isDriverTombstoned(d));
        const idx = list.findIndex(d => d.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated };
          saveLocalDrivers(list);
        }
        return updated;
      }
    } catch (err) {
      console.warn('[FleetFuel] Erro ao atualizar motorista no Supabase:', err);
    }
  }

  removeDriverFromBlacklist(id, updates.cpf, updates.full_name);
  const list = getLocalDrivers().filter(d => !isDriverTombstoned(d));
  const idx = list.findIndex(d => d.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    saveLocalDrivers(list);
    return list[idx];
  }
  throw new Error('Motorista não encontrado para atualização.');
}

/**
 * Exclusão permanente com Tombstone Anti-Ressurreição (`department = '__EXCLUIDO__'`).
 * Neutraliza qualquer aba antiga em cache (celular/outro navegador) que possua rotina legada de sync,
 * impedindo que o registro seja reenviado ao Supabase por clientes desatualizados.
 */
export async function deleteFleetDriver(id: string, cpf?: string): Promise<boolean> {
  const rawCpf = cpf ? cpf.trim() : null;
  const hasRealCpf = isRealCpf(rawCpf);
  const digitsCpf = hasRealCpf && rawCpf ? rawCpf.replace(/\D/g, '') : null;
  const tombstonePayload = {
    department: TOMBSTONE_MARKER,
    status: 'inativo',
    updated_at: new Date().toISOString()
  };

  // 1. Registra no blacklist persistente imediatamente (nunca blacklista CPF zerado)
  addDriverToBlacklist(id, hasRealCpf ? rawCpf || undefined : undefined);

  // 2. DELETE direto no Supabase por ID
  try {
    if (isValidUUID(id)) {
      await supabase.from('fleet_drivers').delete().eq('id', id);
      await supabaseAnon.from('fleet_drivers').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao deletar motorista por ID no Supabase:', err);
  }

  // 3. DELETE direto no Supabase por CPF (somente se for CPF real, nunca 000.000.000-00)
  if (hasRealCpf && rawCpf) {
    try {
      await supabase.from('fleet_drivers').delete().eq('cpf', rawCpf);
      await supabaseAnon.from('fleet_drivers').delete().eq('cpf', rawCpf);
    } catch {}
  }

  // 4. Marcar Tombstone no Supabase por ID caso DELETE seja restrito por FK
  try {
    if (isValidUUID(id)) {
      let { error } = await supabase.from('fleet_drivers').update(tombstonePayload).eq('id', id);
      if (error && isRlsError(error)) {
        await supabaseAnon.from('fleet_drivers').update(tombstonePayload).eq('id', id);
      } else {
        await supabaseAnon.from('fleet_drivers').update(tombstonePayload).eq('id', id);
      }
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao marcar tombstone em motorista por ID no Supabase:', err);
  }

  // 5. Marcar Tombstone no Supabase por CPF (somente se for CPF real)
  if (hasRealCpf && (rawCpf || digitsCpf)) {
    try {
      const filters: string[] = [];
      if (rawCpf) filters.push(`cpf.eq.${rawCpf}`);
      if (digitsCpf && digitsCpf !== rawCpf) filters.push(`cpf.eq.${digitsCpf}`);
      if (filters.length > 0) {
        await supabase.from('fleet_drivers').update(tombstonePayload).or(filters.join(','));
        await supabaseAnon.from('fleet_drivers').update(tombstonePayload).or(filters.join(','));
      }
    } catch (err) {
      console.warn('[FleetFuel] Erro ao excluir motorista por CPF no Supabase:', err);
    }
  }

  // 6. Remover do cache local
  const list = getLocalDrivers();
  const filtered = list.filter(d => {
    if (isDriverTombstoned(d)) return false;
    if (d.id === id) return false;
    if (hasRealCpf && rawCpf && d.cpf === rawCpf) return false;
    if (hasRealCpf && digitsCpf && d.cpf && d.cpf.replace(/\D/g, '') === digitsCpf) return false;
    return true;
  });
  saveLocalDrivers(filtered);
  return true;
}

export async function clearAllFleetDrivers(_institutionId?: string): Promise<{ success: boolean; count: number; message: string }> {
  const tombstonePayload = {
    department: TOMBSTONE_MARKER,
    status: 'inativo',
    updated_at: new Date().toISOString()
  };

  // Blacklist todos os motoristas locais atuais
  const currentLocal = getLocalDrivers();
  for (const d of currentLocal) {
    addDriverToBlacklist(d.id, d.cpf, d.full_name);
  }

  // 1. DELETE direto de todos os motoristas no Supabase
  try {
    await supabase.from('fleet_drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAnon.from('fleet_drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err) {
    console.warn('[FleetFuel] Erro ao deletar motoristas no Supabase:', err);
  }

  // 2. Tombstone como contingência
  try {
    await supabase.from('fleet_drivers').update(tombstonePayload).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAnon.from('fleet_drivers').update(tombstonePayload).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err) {
    console.warn('[FleetFuel] Erro ao limpar motoristas no Supabase:', err);
  }

  saveLocalDrivers([]);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_DRIVERS_CLEARED, 'true');
      localStorage.removeItem(STORAGE_KEY_DRIVERS);
    } catch {}
  }

  return {
    success: true,
    count: 0,
    message: 'Todos os motoristas foram excluídos com sucesso do banco de dados e do sistema. O cadastro está zerado.'
  };
}

/**
 * ====================================================================
 * GESTÃO DE POSTOS DE COMBUSTÍVEL CREDENCIADOS (fleet_fuel_stations)
 * ====================================================================
 */

export async function getFleetFuelStations(filters?: {
  institutionId?: string;
  search?: string;
}): Promise<FleetFuelStation[]> {
  const isCleared = typeof window !== 'undefined' && localStorage.getItem('gestao360_stations_cleared') === 'true';
  let remoteList: FleetFuelStation[] | null = null;

  try {
    let query = supabase.from('fleet_fuel_stations').select('*');
    if (filters?.institutionId && filters.institutionId !== 'all') {
      query = query.or(`institution_id.eq.${filters.institutionId},institution_id.eq.inst_1,institution_id.eq.default`);
    }
    let { data, error } = await query.order('name', { ascending: true });
    if (error && isRlsError(error)) {
      let anonQuery = supabaseAnon.from('fleet_fuel_stations').select('*');
      if (filters?.institutionId && filters.institutionId !== 'all') {
        anonQuery = anonQuery.or(`institution_id.eq.${filters.institutionId},institution_id.eq.inst_1,institution_id.eq.default`);
      }
      const anonRes = await anonQuery.order('name', { ascending: true });
      data = anonRes.data;
      error = anonRes.error;
    }

    if (!error && data) {
      remoteList = (data as FleetFuelStation[]).filter(s => !isStationTombstoned(s));
    } else if (error) {
      console.warn('[FleetFuel] Erro ao consultar postos no Supabase:', error);
    }
  } catch (err) {
    console.warn('[FleetFuel] Exceção ao consultar postos no Supabase:', err);
  }

  // Se a consulta remota ao Supabase respondeu, ela é a Fonte Única da Verdade!
  if (remoteList !== null) {
    // Se o usuário limpou todos os postos deliberadamente e a nuvem está vazia, respeita vazio
    if (isCleared && remoteList.length === 0) {
      saveLocalStations([]);
      return [];
    }
    saveLocalStations(remoteList);
    let result = remoteList;
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(s => s.name.toLowerCase().includes(q) || (s.cnpj && s.cnpj.includes(q)));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Fallback offline
  if (isCleared) {
    return [];
  }
  const localList = getLocalStations().filter(s => !isStationTombstoned(s));
  let result = localList;
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(s => s.name.toLowerCase().includes(q) || (s.cnpj && s.cnpj.includes(q)));
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createFleetFuelStation(payload: NewStationPayload): Promise<FleetFuelStation> {
  let stationId = isValidUUID(payload.id) ? payload.id! : generateValidUUID();
  const cleanName = payload.name.trim();
  const cnpj = payload.cnpj && payload.cnpj.trim() !== '' ? payload.cnpj.trim() : null;
  const address = payload.address && payload.address.trim() !== '' ? payload.address.trim() : 'Endereço não informado';
  const city = payload.city && payload.city.trim() !== '' ? payload.city.trim() : null;
  const phone = payload.phone && payload.phone.trim() !== '' ? payload.phone.trim() : null;

  // Se já existir posto no Supabase com o mesmo Nome ou CNPJ (mesmo tombstoned), reutiliza o UUID para reativar
  try {
    const stFilters: string[] = [`name.ilike.${cleanName}`];
    if (cnpj) stFilters.push(`cnpj.eq.${cnpj}`);
    let { data: existing, error: exErr } = await supabase.from('fleet_fuel_stations').select('id').or(stFilters.join(',')).limit(1).maybeSingle();
    if (exErr && isRlsError(exErr)) {
      const anonEx = await supabaseAnon.from('fleet_fuel_stations').select('id').or(stFilters.join(',')).limit(1).maybeSingle();
      existing = anonEx.data;
    }
    if (existing?.id) {
      stationId = existing.id;
    }
  } catch {}

  const supabaseRecord = {
    id: stationId,
    institution_id: payload.institution_id || 'inst_1',
    name: cleanName,
    cnpj: cnpj,
    address: address,
    city: city,
    phone: phone,
    status: payload.status || 'ativo'
  };

  try {
    let { data, error } = await supabase.from('fleet_fuel_stations').upsert([supabaseRecord], { onConflict: 'id' }).select().single();
    if (error && isRlsError(error)) {
      const retry = await supabaseAnon.from('fleet_fuel_stations').upsert([supabaseRecord], { onConflict: 'id' }).select().single();
      data = retry.data;
      error = retry.error;
    }
    if (!error && data) {
      removeStationFromBlacklist(stationId, cleanName, cnpj || undefined);
      const list = getLocalStations().filter(s => !isStationTombstoned(s));
      const existingIdx = list.findIndex(s => s.id === stationId);
      if (existingIdx !== -1) {
        list[existingIdx] = data as FleetFuelStation;
      } else {
        list.unshift(data as FleetFuelStation);
      }
      saveLocalStations(list);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('gestao360_stations_cleared'); } catch {}
      }
      return data as FleetFuelStation;
    } else if (error) {
      console.error('[FleetFuel] Erro ao gravar posto no Supabase:', error);
      throw new Error(`Falha ao registrar posto na nuvem Supabase: ${error.message}`);
    }
  } catch (err: unknown) {
    console.error('[FleetFuel] Exceção ao gravar posto no Supabase:', err);
    if (err instanceof Error && err.message.includes('Supabase:')) {
      throw err;
    }
    throw new Error(`Erro ao conectar com Supabase: ${err instanceof Error ? err.message : String(err)}`);
  }

  throw new Error('Não foi possível registrar o posto no Supabase.');
}

export async function updateFleetFuelStation(id: string, updates: Partial<FleetFuelStation>): Promise<FleetFuelStation> {
  const cnpj = updates.cnpj !== undefined ? (updates.cnpj && updates.cnpj.trim() !== '' ? updates.cnpj.trim() : null) : undefined;
  const address = updates.address !== undefined ? (updates.address && updates.address.trim() !== '' ? updates.address.trim() : 'Endereço não informado') : undefined;
  const city = updates.city !== undefined ? (updates.city && updates.city.trim() !== '' ? updates.city.trim() : null) : undefined;
  const phone = updates.phone !== undefined ? (updates.phone && updates.phone.trim() !== '' ? updates.phone.trim() : null) : undefined;

  const supabaseRecord: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };
  if (updates.name) supabaseRecord.name = updates.name.trim();
  if (cnpj !== undefined) supabaseRecord.cnpj = cnpj;
  if (address !== undefined) supabaseRecord.address = address;
  if (city !== undefined) supabaseRecord.city = city;
  if (phone !== undefined) supabaseRecord.phone = phone;
  if (updates.status) supabaseRecord.status = updates.status;

  if (isValidUUID(id)) {
    try {
      let { data, error } = await supabase.from('fleet_fuel_stations').update(supabaseRecord).eq('id', id).select().single();
      if (error && isRlsError(error)) {
        const retry = await supabaseAnon.from('fleet_fuel_stations').update(supabaseRecord).eq('id', id).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (!error && data) {
        const list = getLocalStations().filter(s => !isStationTombstoned(s));
        const idx = list.findIndex(s => s.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...data };
          saveLocalStations(list);
        }
        return data as FleetFuelStation;
      }
    } catch (err) {
      console.warn('[FleetFuel] Erro ao atualizar posto no Supabase:', err);
    }
  }

  const list = getLocalStations().filter(s => !isStationTombstoned(s));
  const idx = list.findIndex(s => s.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    saveLocalStations(list);
    return list[idx];
  }
  throw new Error('Posto credenciado não encontrado para atualização.');
}

export async function deleteFleetFuelStation(id: string, name?: string, cnpj?: string): Promise<boolean> {
  const cleanName = name ? name.trim() : null;
  const cleanCnpj = cnpj ? cnpj.trim() : null;
  const digitsCnpj = cleanCnpj ? cleanCnpj.replace(/\D/g, '') : null;
  const tombstonePayload = {
    address: TOMBSTONE_MARKER,
    phone: TOMBSTONE_MARKER,
    status: 'inativo',
    updated_at: new Date().toISOString()
  };

  // 1. Registra no blacklist persistente imediatamente
  addStationToBlacklist(id, cleanName || undefined, cleanCnpj || undefined);

  // 2. DELETE direto no Supabase por ID
  try {
    if (isValidUUID(id)) {
      await supabase.from('fleet_fuel_stations').delete().eq('id', id);
      await supabaseAnon.from('fleet_fuel_stations').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao deletar posto por ID no Supabase:', err);
  }

  // 3. DELETE direto no Supabase por Nome
  if (cleanName) {
    try {
      await supabase.from('fleet_fuel_stations').delete().eq('name', cleanName);
      await supabaseAnon.from('fleet_fuel_stations').delete().eq('name', cleanName);
    } catch {}
  }

  // 4. Marca Tombstone caso o DELETE não seja permitido por integridade referencial
  try {
    if (isValidUUID(id)) {
      await supabase.from('fleet_fuel_stations').update(tombstonePayload).eq('id', id);
      await supabaseAnon.from('fleet_fuel_stations').update(tombstonePayload).eq('id', id);
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao marcar tombstone em posto por ID no Supabase:', err);
  }

  if (cleanName) {
    try {
      await supabase.from('fleet_fuel_stations').update(tombstonePayload).eq('name', cleanName);
      await supabaseAnon.from('fleet_fuel_stations').update(tombstonePayload).eq('name', cleanName);
    } catch {}
  }

  // 5. Atualizar cache local
  const list = getLocalStations();
  const filtered = list.filter(s => {
    if (isStationTombstoned(s)) return false;
    if (s.id === id) return false;
    if (cleanName && s.name.toLowerCase().trim() === cleanName.toLowerCase()) return false;
    if (cleanCnpj && s.cnpj === cleanCnpj) return false;
    if (digitsCnpj && s.cnpj && s.cnpj.replace(/\D/g, '') === digitsCnpj) return false;
    return true;
  });
  saveLocalStations(filtered);
  return true;
}

export async function clearAllFleetFuelStations(_institutionId?: string): Promise<{ success: boolean; count: number; message: string }> {
  const tombstonePayload = {
    address: TOMBSTONE_MARKER,
    phone: TOMBSTONE_MARKER,
    status: 'inativo',
    updated_at: new Date().toISOString()
  };

  // Blacklist todos os postos locais atuais
  const currentLocal = getLocalStations();
  for (const s of currentLocal) {
    addStationToBlacklist(s.id, s.name, s.cnpj);
  }

  // 1. DELETE direto de todos os postos no Supabase
  try {
    await supabase.from('fleet_fuel_stations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAnon.from('fleet_fuel_stations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err) {
    console.warn('[FleetFuel] Erro ao deletar postos no Supabase:', err);
  }

  // 2. Tombstone como contingência
  try {
    await supabase.from('fleet_fuel_stations').update(tombstonePayload).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAnon.from('fleet_fuel_stations').update(tombstonePayload).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err) {
    console.warn('[FleetFuel] Erro ao limpar postos no Supabase:', err);
  }

  saveLocalStations([]);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('gestao360_stations_cleared', 'true');
      localStorage.removeItem(STORAGE_KEY_STATIONS);
    } catch {}
  }

  return {
    success: true,
    count: 0,
    message: 'Todos os postos credenciados foram excluídos com sucesso do banco de dados e do sistema.'
  };
}

/**
 * Sincroniza motoristas e postos retidos no cache local do computador para o banco de dados Supabase
 * Garante que registros criados anteriormente com IDs provisórios (drv- / sta-) sejam convertidos para UUID
 * e fiquem disponíveis na nuvem para qualquer dispositivo (celular, outros computadores).
 */
export async function syncLocalDriversAndStationsToSupabase(institutionId: string = 'inst_1'): Promise<{
  syncedDrivers: number;
  syncedStations: number;
}> {
  let syncedDrivers = 0;
  let syncedStations = 0;

  const isDriversCleared = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_DRIVERS_CLEARED) === 'true';

  // 1. Sincronizar Motoristas (apenas se o cadastro não foi explicitamente zerado)
  if (!isDriversCleared) {
    try {
      const localDrivers = getLocalDrivers().filter(d => !isDriverTombstoned(d));
      if (localDrivers.length > 0) {
        let { data: remoteDrivers, error: fetchErr } = await supabase.from('fleet_drivers').select('id, cpf, full_name');
        if (fetchErr && isRlsError(fetchErr)) {
          const anonFetch = await supabaseAnon.from('fleet_drivers').select('id, cpf, full_name');
          remoteDrivers = anonFetch.data;
        }
        const remoteCpfs = new Set(
          (remoteDrivers || [])
            .filter(r => isRealCpf(r.cpf))
            .map(r => (r.cpf || '').replace(/\D/g, ''))
        );
        const remoteIds = new Set((remoteDrivers || []).map(r => r.id));

        const updatedLocalList: FleetDriver[] = [];
        const recordsToInsert = [];

        for (const d of localDrivers) {
          if (isDriverTombstoned(d)) continue;
          const cleanCpf = (d.cpf || '').replace(/\D/g, '');
          const hasValidLocalCpf = isRealCpf(d.cpf);
          const validId = isValidUUID(d.id) ? d.id : generateValidUUID();
          const updatedDriver: FleetDriver = { ...d, id: validId };
          updatedLocalList.push(updatedDriver);

          if ((!hasValidLocalCpf || !remoteCpfs.has(cleanCpf)) && !remoteIds.has(validId)) {
            recordsToInsert.push({
              id: validId,
              institution_id: d.institution_id || institutionId,
              full_name: d.full_name.trim(),
              cpf: (d.cpf || '').trim(),
              birth_date: d.birth_date && d.birth_date.trim() !== '' ? d.birth_date.trim() : null,
              department: d.department?.trim() || 'Geral',
              cnh_number: d.cnh_number && d.cnh_number.trim() !== '' ? d.cnh_number.trim() : null,
              cnh_category: d.cnh_category && d.cnh_category.trim() !== '' ? d.cnh_category.trim() : null,
              status: d.status || 'ativo'
            });
          }
        }

        saveLocalDrivers(updatedLocalList);

        if (recordsToInsert.length > 0) {
          let { error } = await supabase.from('fleet_drivers').upsert(recordsToInsert, { onConflict: 'id' });
          if (error && isRlsError(error)) {
            const retry = await supabaseAnon.from('fleet_drivers').upsert(recordsToInsert, { onConflict: 'id' });
            error = retry.error;
          }
          if (!error) {
            syncedDrivers = recordsToInsert.length;
            console.log(`[FleetFuel] ${syncedDrivers} motoristas sincronizados com Supabase!`);
          } else {
            console.error('[FleetFuel] Erro ao sincronizar motoristas com Supabase:', error);
          }
        }
      }
    } catch (err) {
      console.warn('[FleetFuel] Erro no sync de motoristas:', err);
    }
  } else {
    saveLocalDrivers([]);
  }

  // 2. Sincronizar Postos Credenciados (apenas se o cadastro não foi explicitamente zerado)
  const isStationsCleared = typeof window !== 'undefined' && localStorage.getItem('gestao360_stations_cleared') === 'true';
  if (!isStationsCleared) {
    try {
      const localStations = getLocalStations().filter(s => !isStationTombstoned(s));
      if (localStations.length > 0) {
        let { data: remoteStations, error: fetchErr } = await supabase.from('fleet_fuel_stations').select('id, name');
        if (fetchErr && isRlsError(fetchErr)) {
          const anonFetch = await supabaseAnon.from('fleet_fuel_stations').select('id, name');
          remoteStations = anonFetch.data;
        }
        const remoteNames = new Set((remoteStations || []).map(r => r.name?.toLowerCase().trim()));
        const remoteIds = new Set((remoteStations || []).map(r => r.id));

        const updatedLocalStations: FleetFuelStation[] = [];
        const stationsToInsert = [];

        for (const s of localStations) {
          if (isStationTombstoned(s)) continue;
          const validId = isValidUUID(s.id) ? s.id : generateValidUUID();
          const updatedStation: FleetFuelStation = { ...s, id: validId };
          updatedLocalStations.push(updatedStation);

          if (!remoteNames.has(s.name.toLowerCase().trim()) && !remoteIds.has(validId)) {
            stationsToInsert.push({
              id: validId,
              institution_id: s.institution_id || institutionId,
              name: s.name.trim(),
              cnpj: s.cnpj && s.cnpj.trim() !== '' ? s.cnpj.trim() : null,
              address: s.address && s.address.trim() !== '' ? s.address.trim() : null,
              city: s.city && s.city.trim() !== '' ? s.city.trim() : null,
              phone: s.phone && s.phone.trim() !== '' ? s.phone.trim() : null,
              status: s.status || 'ativo'
            });
          }
        }

        saveLocalStations(updatedLocalStations);

        if (stationsToInsert.length > 0) {
          let { error } = await supabase.from('fleet_fuel_stations').upsert(stationsToInsert, { onConflict: 'id' });
          if (error && isRlsError(error)) {
            const retry = await supabaseAnon.from('fleet_fuel_stations').upsert(stationsToInsert, { onConflict: 'id' });
            error = retry.error;
          }
          if (!error) {
            syncedStations = stationsToInsert.length;
            console.log(`[FleetFuel] ${syncedStations} postos sincronizados com Supabase!`);
          } else {
            console.error('[FleetFuel] Erro ao sincronizar postos com Supabase:', error);
          }
        }
      }
    } catch (err) {
      console.warn('[FleetFuel] Erro no sync de postos:', err);
    }
  } else {
    saveLocalStations([]);
  }

  return { syncedDrivers, syncedStations };
}

/**
 * ====================================================================
 * CLASSIFICAÇÃO ORÇAMENTÁRIA PADRÃO E SERVIÇOS
 * ====================================================================
 */
export const DEFAULT_BUDGET_CLASSIFICATIONS: Omit<FleetBudgetClassification, 'id' | 'institution_id'>[] = [
  { department_local: 'Gabinete', invoice_sheet: '11', funding_source: '1.1.500.0', budget_code: '18' },
  { department_local: 'Administração', invoice_sheet: '24', funding_source: '1.1.500.0', budget_code: '34' },
  { department_local: 'Secretaria de Educação', invoice_sheet: '47', funding_source: '2.1.500.1001000', budget_code: '19' },
  { department_local: 'Ens. Fundamental', invoice_sheet: '56', funding_source: '2.1.500.1001000', budget_code: '30' },
  { department_local: 'Transporte Escolar', invoice_sheet: '57', funding_source: '2.1.500.1001000', budget_code: '20' },
  { department_local: 'Transporte Escolar', invoice_sheet: '58', funding_source: '2.1.571.0', budget_code: '20' },
  { department_local: 'QSE', invoice_sheet: '61', funding_source: '2.1.550.0', budget_code: '20' },
  { department_local: 'PNATE', invoice_sheet: '64', funding_source: '2.1.553.0', budget_code: undefined },
  { department_local: 'Educação Infantil', invoice_sheet: '72', funding_source: '2.1.500.1001000', budget_code: '20' },
  { department_local: 'Secretaria de Viação', invoice_sheet: '106', funding_source: '1.1.500.0', budget_code: '22' },
  { department_local: 'Secretaria de Viação - CIDE', invoice_sheet: '107', funding_source: '1.1.750.0', budget_code: '22' },
  { department_local: 'FMT', invoice_sheet: '112', funding_source: '1.1.759.700', budget_code: '21' },
  { department_local: 'PSF', invoice_sheet: '152', funding_source: '3.1.500.1002000', budget_code: '28' },
  { department_local: 'PSF', invoice_sheet: '153', funding_source: '3.1.600.0', budget_code: '28' },
  { department_local: 'PSF', invoice_sheet: '154', funding_source: '3.1.621.0', budget_code: '28' },
  { department_local: 'TFD', invoice_sheet: '198', funding_source: '3.1.500.1002000', budget_code: '23' },
  { department_local: 'TFD', invoice_sheet: '199', funding_source: '3.1.600.0', budget_code: '23' },
  { department_local: 'TFD', invoice_sheet: '203', funding_source: '3.1.621.0', budget_code: '23' },
  { department_local: 'MAC', invoice_sheet: '211', funding_source: '3.1.500.1002000', budget_code: '24' },
  { department_local: 'MAC', invoice_sheet: '212', funding_source: '3.1.600.0', budget_code: '24' },
  { department_local: 'MAC', invoice_sheet: '213', funding_source: '3.1.621.0', budget_code: '24' },
  { department_local: 'Vigilância Sanitária', invoice_sheet: '223', funding_source: '3.1.600.0', budget_code: '29' },
  { department_local: 'Secretaria de Saúde', invoice_sheet: '231', funding_source: '3.1.500.1002000', budget_code: '25' },
  { department_local: 'Meio Ambiente', invoice_sheet: '234', funding_source: '1.1.500.0', budget_code: undefined },
  { department_local: 'Secret. de Agricultura', invoice_sheet: '241', funding_source: '1.1.500.0', budget_code: '30' },
  { department_local: 'Secret. de Assistência', invoice_sheet: '276', funding_source: '4.1.500.0', budget_code: '26' },
  { department_local: 'Conselho Tutelar', invoice_sheet: '281', funding_source: '4.1.500.0', budget_code: '42' },
  { department_local: 'Secret. Serv Públicos', invoice_sheet: '335', funding_source: '1.1.500.0', budget_code: '41' },
  { department_local: 'Serviços de Limpeza', invoice_sheet: '339', funding_source: '1.1.500.0', budget_code: '27' },
  { department_local: 'Manut. Serv. Publicos', invoice_sheet: '345', funding_source: '1.1.500.0', budget_code: '35' },
  { department_local: 'Saet', invoice_sheet: '350', funding_source: '1.1.500.0', budget_code: '40' }
];

const STORAGE_KEY_BUDGET = 'gestao360_fleet_budget_classifications';

export function getLocalBudgetClassifications(): FleetBudgetClassification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUDGET);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Assegurar que os IDs sejam UUIDs válidos e estáveis
        const migrated = parsed.map(item => ({
          ...item,
          id: isValidUUID(item.id) ? item.id : toBudgetUUID(item.invoice_sheet)
        }));
        return migrated.sort((a, b) => (parseInt(a.invoice_sheet, 10) || 0) - (parseInt(b.invoice_sheet, 10) || 0));
      }
    }
  } catch {}
  return [...DEFAULT_BUDGET_CLASSIFICATIONS]
    .sort((a, b) => (parseInt(a.invoice_sheet, 10) || 0) - (parseInt(b.invoice_sheet, 10) || 0))
    .map((item) => ({
      id: toBudgetUUID(item.invoice_sheet),
      institution_id: 'default',
      ...item,
      is_active: true,
      created_at: new Date().toISOString()
    }));
}

function saveLocalBudgetClassifications(list: FleetBudgetClassification[]) {
  try {
    localStorage.setItem(STORAGE_KEY_BUDGET, JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fleet-budget-classifications-updated'));
    }
  } catch {}
}


export interface NewBudgetClassificationPayload {
  institution_id?: string;
  department_local: string;
  invoice_sheet: string;
  funding_source: string;
  budget_code?: string;
  is_active?: boolean;
}

const getOrderBudgetsStorageKey = (institutionId?: string) =>
  `@gestao360:fuel_order_budgets_${institutionId || 'inst_1'}`;

/**
 * Consulta o mapa de fichas orçamentárias vinculadas a cada ordem (persistido na nuvem em institutions.notes)
 */
export async function getFuelOrderBudgetsFromSupabase(institutionId: string = 'inst_1'): Promise<Record<string, string>> {
  const targetInst = institutionId || 'inst_1';
  let cached: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getOrderBudgetsStorageKey(targetInst));
      if (raw) cached = JSON.parse(raw);
    } catch {}
  }

  try {
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
        const parsed = JSON.parse(data.notes);
        if (parsed?.fuel_order_budgets && typeof parsed.fuel_order_budgets === 'object') {
          const merged = { ...cached, ...parsed.fuel_order_budgets };
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(getOrderBudgetsStorageKey(targetInst), JSON.stringify(merged)); } catch {}
          }
          return merged;
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[FleetFuel] Aviso ao carregar fichas de ordens do Supabase:', err);
  }

  return cached;
}

/**
 * Salva a vinculação da ficha orçamentária de uma ordem no Supabase (institutions.notes e coluna remota)
 * Garante que qualquer outro computador ou aba anônima visualize a dotação correta imediatamente.
 */
export async function saveFuelOrderBudgetToSupabase(
  orderId: string,
  orderNumber: string | undefined,
  budgetId: string,
  institutionId: string = 'inst_1'
): Promise<void> {
  const targetInst = institutionId || 'inst_1';

  // 1. Atualizar cache local síncrono
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getOrderBudgetsStorageKey(targetInst));
      const map = raw ? JSON.parse(raw) : {};
      if (orderId) map[orderId] = budgetId;
      if (orderNumber) map[orderNumber] = budgetId;
      localStorage.setItem(getOrderBudgetsStorageKey(targetInst), JSON.stringify(map));
    } catch {}
  }

  // 2. Persistir no Supabase remoto (institutions.notes)
  try {
    let { data } = await supabase
      .from('institutions')
      .select('notes')
      .eq('id', targetInst)
      .maybeSingle();

    if (!data) {
      const anonRes = await supabaseAnon
        .from('institutions')
        .select('notes')
        .eq('id', targetInst)
        .maybeSingle();
      data = anonRes.data;
    }

    const currentNotes = data?.notes ? JSON.parse(data.notes) : {};
    if (!currentNotes.fuel_order_budgets || typeof currentNotes.fuel_order_budgets !== 'object') {
      currentNotes.fuel_order_budgets = {};
    }
    if (orderId) currentNotes.fuel_order_budgets[orderId] = budgetId;
    if (orderNumber) currentNotes.fuel_order_budgets[orderNumber] = budgetId;

    let { error } = await supabase
      .from('institutions')
      .update({ notes: JSON.stringify(currentNotes) })
      .eq('id', targetInst);

    if (error) {
      await supabaseAnon
        .from('institutions')
        .update({ notes: JSON.stringify(currentNotes) })
        .eq('id', targetInst);
    }
  } catch (err) {
    console.warn('[FleetFuel] Aviso ao persistir ficha em institutions.notes:', err);
  }

  // 3. Tentar também atualizar diretamente a coluna budget_classification_id em fuel_supply_orders caso exista
  try {
    const updatePayload = { budget_classification_id: budgetId };
    if (isValidUUID(orderId)) {
      const res = await supabase.from('fuel_supply_orders').update(updatePayload).eq('id', orderId);
      if (res.error) await supabaseAnon.from('fuel_supply_orders').update(updatePayload).eq('id', orderId);
    } else if (orderNumber) {
      const res = await supabase.from('fuel_supply_orders').update(updatePayload).eq('order_number', orderNumber);
      if (res.error) await supabaseAnon.from('fuel_supply_orders').update(updatePayload).eq('order_number', orderNumber);
    }
  } catch {}
}

export async function createFleetBudgetClassification(
  payload: NewBudgetClassificationPayload,
  institutionId: string = 'inst_1'
): Promise<FleetBudgetClassification> {
  const targetInst = payload.institution_id || institutionId || 'default';
  const newItem: FleetBudgetClassification = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bc-${Date.now()}`,
    institution_id: targetInst,
    department_local: payload.department_local.trim(),
    invoice_sheet: payload.invoice_sheet.trim(),
    funding_source: payload.funding_source.trim(),
    budget_code: payload.budget_code?.trim() || undefined,
    is_active: payload.is_active ?? true,
    created_at: new Date().toISOString()
  };

  try {
    let { data, error } = await supabase
      .from('fleet_budget_classifications')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      const fallbackItem = { ...newItem, institution_id: 'default' };
      const retryAnon = await supabaseAnon
        .from('fleet_budget_classifications')
        .insert([fallbackItem])
        .select()
        .single();
      if (!retryAnon.error && retryAnon.data) {
        data = retryAnon.data;
        error = null;
      }
    }

    if (!error && data) {
      const list = getLocalBudgetClassifications();
      saveLocalBudgetClassifications([data as FleetBudgetClassification, ...list.filter(x => x.id !== data.id && x.invoice_sheet !== data.invoice_sheet)]);
      return data as FleetBudgetClassification;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao criar classificação no Supabase:', err);
  }

  const list = getLocalBudgetClassifications();
  saveLocalBudgetClassifications([newItem, ...list]);
  return newItem;
}

export async function updateFleetBudgetClassification(
  id: string,
  payload: Partial<NewBudgetClassificationPayload>
): Promise<FleetBudgetClassification> {
  const list = getLocalBudgetClassifications();
  const existingIdx = list.findIndex(item => item.id === id);
  const existing = existingIdx !== -1 ? list[existingIdx] : null;

  const updated: FleetBudgetClassification = {
    id,
    institution_id: existing?.institution_id || 'default',
    department_local: payload.department_local !== undefined ? payload.department_local.trim() : (existing?.department_local || ''),
    invoice_sheet: payload.invoice_sheet !== undefined ? payload.invoice_sheet.trim() : (existing?.invoice_sheet || ''),
    funding_source: payload.funding_source !== undefined ? payload.funding_source.trim() : (existing?.funding_source || ''),
    budget_code: payload.budget_code !== undefined ? (payload.budget_code.trim() || undefined) : existing?.budget_code,
    is_active: payload.is_active !== undefined ? payload.is_active : (existing?.is_active ?? true),
    created_at: existing?.created_at || new Date().toISOString()
  };

  try {
    const updatePayload = {
      department_local: updated.department_local,
      invoice_sheet: updated.invoice_sheet,
      funding_source: updated.funding_source,
      budget_code: updated.budget_code,
      is_active: updated.is_active
    };

    let { data, error } = await supabase
      .from('fleet_budget_classifications')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const retryAnon = await supabaseAnon
        .from('fleet_budget_classifications')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (!retryAnon.error && retryAnon.data) {
        data = retryAnon.data;
        error = null;
      }
    }

    if (!error && data) {
      if (existingIdx !== -1) {
        list[existingIdx] = data as FleetBudgetClassification;
      } else {
        list.unshift(data as FleetBudgetClassification);
      }
      saveLocalBudgetClassifications(list);
      return data as FleetBudgetClassification;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao atualizar classificação no Supabase:', err);
  }

  if (existingIdx !== -1) {
    list[existingIdx] = updated;
  } else {
    list.unshift(updated);
  }
  saveLocalBudgetClassifications(list);
  return updated;
}

export async function deleteFleetBudgetClassification(id: string): Promise<boolean> {
  try {
    let { error } = await supabase.from('fleet_budget_classifications').delete().eq('id', id);
    if (error) {
      await supabaseAnon.from('fleet_budget_classifications').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao deletar classificação no Supabase:', err);
  }

  const list = getLocalBudgetClassifications();
  const filtered = list.filter(item => item.id !== id);
  saveLocalBudgetClassifications(filtered);
  return true;
}

export async function getFleetBudgetClassifications(institutionId?: string): Promise<FleetBudgetClassification[]> {
  try {
    const buildQuery = (client: any) => {
      let query = client.from('fleet_budget_classifications').select('*');
      if (institutionId) {
        query = query.or(`institution_id.eq.${institutionId},institution_id.eq.default,institution_id.is.null`);
      }
      return query;
    };

    let { data, error } = await buildQuery(supabase);
    if (error) {
      const retryAnon = await buildQuery(supabaseAnon);
      if (!retryAnon.error && retryAnon.data) {
        data = retryAnon.data;
        error = null;
      }
    }

    if (!error && data && data.length > 0) {
      const sorted = (data as FleetBudgetClassification[]).sort(
        (a, b) => (parseInt(a.invoice_sheet, 10) || 0) - (parseInt(b.invoice_sheet, 10) || 0)
      );
      saveLocalBudgetClassifications(sorted);
      return sorted;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao buscar classificações orçamentárias:', err);
  }
  return getLocalBudgetClassifications();
}

/**
 * IMPORTAÇÃO EM LOTE DE MOTORISTAS (.XLSX / .CSV)
 */
export async function createDriversBatch(
  driversList: NewDriverPayload[],
  institutionId: string = 'inst_1'
): Promise<{ count: number; saved: FleetDriver[] }> {
  // Mapeia CPFs reais já existentes no banco (inclusive excluídos/tombstone) para reutilizar o mesmo UUID sem colidir CPFs zerados (000.000.000-00)
  const existingCpfMap = new Map<string, string>();
  try {
    let { data: existingRows, error: exErr } = await supabase.from('fleet_drivers').select('id, cpf');
    if (exErr && isRlsError(exErr)) {
      const anonEx = await supabaseAnon.from('fleet_drivers').select('id, cpf');
      existingRows = anonEx.data;
    }
    (existingRows || []).forEach(r => {
      if (r.cpf && r.id && isRealCpf(r.cpf)) {
        existingCpfMap.set(r.cpf.trim(), r.id);
        const clean = r.cpf.replace(/\D/g, '');
        if (clean) existingCpfMap.set(clean, r.id);
      }
    });
  } catch {}

  const newDrivers: FleetDriver[] = driversList.map((payload) => {
    const rawCpf = (payload.cpf || '').trim();
    const digitsCpf = rawCpf.replace(/\D/g, '');
    const hasValidCpf = isRealCpf(rawCpf);
    const matchedId = hasValidCpf
      ? (existingCpfMap.get(rawCpf) || (digitsCpf ? existingCpfMap.get(digitsCpf) : undefined))
      : undefined;
    const driverId = isValidUUID(payload.id) ? payload.id! : (matchedId || generateValidUUID());
    if (hasValidCpf) {
      if (rawCpf) existingCpfMap.set(rawCpf, driverId);
      if (digitsCpf) existingCpfMap.set(digitsCpf, driverId);
    }
    const birthDate = sanitizeDateToISO(payload.birth_date);
    const cnhNumber = payload.cnh_number && payload.cnh_number.trim() !== '' ? payload.cnh_number.trim() : null;
    const cnhCat = payload.cnh_category && payload.cnh_category.trim() !== '' ? payload.cnh_category.trim() : 'B';

    return {
      id: driverId,
      institution_id: payload.institution_id || institutionId,
      full_name: payload.full_name.trim(),
      cpf: rawCpf,
      birth_date: birthDate || undefined,
      department: payload.department?.trim() || 'Geral',
      cnh_number: cnhNumber || undefined,
      cnh_category: cnhCat,
      status: (payload.status === 'inativo' || payload.status === 'afastado') ? payload.status : 'ativo',
      created_at: new Date().toISOString()
    };
  });

  // Deduplica por ID para evitar erro do PostgreSQL "ON CONFLICT DO UPDATE command cannot affect row a second time"
  const dedupedDrivers = Array.from(new Map(newDrivers.map(d => [d.id, d])).values());

  const supabaseRecords = dedupedDrivers.map(d => ({
    id: d.id,
    institution_id: d.institution_id,
    full_name: d.full_name,
    cpf: d.cpf,
    birth_date: sanitizeDateToISO(d.birth_date),
    department: d.department || 'Geral',
    cnh_number: d.cnh_number || null,
    cnh_category: d.cnh_category || 'B',
    status: (d.status === 'inativo' || d.status === 'afastado') ? d.status : 'ativo'
  }));

  try {
    let { data, error } = await supabase.from('fleet_drivers').upsert(supabaseRecords, { onConflict: 'id' }).select();
    if (error && isRlsError(error)) {
      const retry = await supabaseAnon.from('fleet_drivers').upsert(supabaseRecords, { onConflict: 'id' }).select();
      data = retry.data;
      error = retry.error;
    }
    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem(STORAGE_KEY_DRIVERS_CLEARED); } catch {}
      }
      (data as FleetDriver[]).forEach(d => removeDriverFromBlacklist(d.id, d.cpf, d.full_name));
      const list = getLocalDrivers().filter(d => !isDriverTombstoned(d));
      const savedMap = new Map(list.map(d => [d.id, d]));
      (data as FleetDriver[]).forEach(d => savedMap.set(d.id, d));
      const combined = Array.from(savedMap.values());
      saveLocalDrivers(combined);
      return { count: data.length, saved: data as FleetDriver[] };
    } else if (error) {
      console.error('[FleetFuel] Erro ao gravar lote de motoristas no Supabase:', error);
      throw new Error(`Falha ao registrar lote no Supabase: ${error.message}`);
    }
  } catch (err: unknown) {
    console.error('[FleetFuel] Exceção ao gravar lote de motoristas no Supabase:', err);
    if (err instanceof Error && err.message.includes('Supabase:')) {
      throw err;
    }
    throw new Error(`Erro ao conectar com Supabase: ${err instanceof Error ? err.message : String(err)}`);
  }

  dedupedDrivers.forEach(d => removeDriverFromBlacklist(d.id, d.cpf, d.full_name));
  const list = getLocalDrivers().filter(d => !isDriverTombstoned(d));
  const combined = [...dedupedDrivers, ...list];
  saveLocalDrivers(combined);
  return { count: dedupedDrivers.length, saved: dedupedDrivers };
}


