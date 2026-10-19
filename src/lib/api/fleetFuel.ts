/**
 * Módulo de Controle e Auditoria de Abastecimento de Frotas
 * Camada de API, Serviços e Motor de Validação Antifraude com DADOS REAIS
 * Em conformidade com o Tribunal de Contas do Estado (TCE) e Lei Federal 4.320/64
 */

import { supabase } from '../supabase';

export type FuelType = 'gasolina' | 'etanol' | 'diesel_s10' | 'diesel_s500' | 'arla32';
export type MetricType = 'km' | 'horimetro';
export type FuelOrderStatus = 'autorizado' | 'abastecido' | 'auditado' | 'glosado' | 'liquidado';

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
  expected_consumption: number; // km/l ou l/h de referência
  current_odometer: number;
  status: 'ativo' | 'manutencao' | 'baixado' | 'inativo';
  is_emergency_priority?: boolean; // Prioridade de Prontidão (Ambulâncias, Ônibus Escolar, Resgate)
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
  calculated_consumption?: number; // km/l ou l/h apurado
  unit_price?: number;
  total_value?: number;
  invoice_number?: string;
  invoice_key?: string; // 44 dígitos da NF-e / NFC-e

  // Prontidão e Urgência (Tanque Cheio)
  is_full_tank_order?: boolean; // Regime de Prontidão Operacional
  emergency_call_reason?: string; // Motivo do Plantão / Chamado de Urgência
  tank_residual_expected?: number; // Litros estimados gastos com base na KM rodada

  // Comprovação documental
  receipt_attachment_url?: string; // Foto/scan do canhoto assinado
  odometer_photo_url?: string; // Foto do painel/bomba
  invoice_attachment_url?: string; // Foto/PDF da nota fiscal

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
  cpf: string;
  birth_date?: string;
  department: string;
  cnh_number?: string;
  cnh_category?: string;
  status: 'ativo' | 'inativo' | 'afastado';
  created_at: string;
  updated_at?: string;
}

export interface NewDriverPayload {
  institution_id?: string;
  full_name: string;
  cpf: string;
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
const BUCKET_NAME = 'certidoes'; // Utiliza o bucket ativo do sistema para anexos de comprovantes

// Limpeza de chaves mock legadas
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('gestao360_fleet_vehicles');
    localStorage.removeItem('gestao360_fuel_supply_orders');
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
  try {
    let query = supabase.from('fleet_vehicles').select('*');
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }
    if (department && department !== 'all') {
      query = query.eq('department', department);
    }
    const { data, error } = await query.order('plate', { ascending: true });

    if (!error && data && data.length > 0) {
      saveLocalRealVehicles(data as FleetVehicle[]);
      return data as FleetVehicle[];
    }
  } catch (err) {
    console.warn('[FleetFuel] Falha ao consultar fleet_vehicles no Supabase:', err);
  }

  // Se o usuário limpou a frota deliberadamente, respeita a lista vazia ou atual
  const isCleared = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_CLEARED) === 'true';
  const localList = getLocalRealVehicles();
  if (isCleared) {
    if (department && department !== 'all') {
      return localList.filter(v => v.department === department);
    }
    return localList;
  }

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
 * Cadastrar novo veículo real na frota
 */
export async function createFleetVehicle(vehicleData: Omit<FleetVehicle, 'id' | 'created_at'>): Promise<FleetVehicle> {
  const newVehicle: FleetVehicle = {
    ...vehicleData,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `veh-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('fleet_vehicles').insert([newVehicle]).select().single();
    if (!error && data) {
      const list = getLocalRealVehicles();
      list.unshift(data as FleetVehicle);
      saveLocalRealVehicles(list);
      return data as FleetVehicle;
    }
  } catch (err) {
    console.warn('[FleetFuel] Nota ao gravar veículo no Supabase, mantendo localmente:', err);
  }

  const list = getLocalRealVehicles();
  list.unshift(newVehicle);
  saveLocalRealVehicles(list);
  return newVehicle;
}

/**
 * Atualizar dados técnicos ou status do veículo no cadastro
 */
export async function updateFleetVehicle(id: string, updates: Partial<FleetVehicle>): Promise<FleetVehicle> {
  try {
    const { data, error } = await supabase.from('fleet_vehicles').update(updates).eq('id', id).select().single();
    if (!error && data) {
      const list = getLocalRealVehicles();
      const idx = list.findIndex(v => v.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
        saveLocalRealVehicles(list);
      }
      return data as FleetVehicle;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao atualizar veículo no Supabase:', err);
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
    let query = supabase.from('fuel_supply_orders').select(`
      *,
      vehicle:fleet_vehicles(*)
    `);

    if (filters?.institutionId) {
      query = query.eq('institution_id', filters.institutionId);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.onlyAnomalies) {
      query = query.eq('is_anomaly', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) {
      saveLocalRealOrders(data as FuelSupplyOrder[]);
      return data as FuelSupplyOrder[];
    }
  } catch (err) {
    console.warn('[FleetFuel] Falha ao consultar ordens no Supabase, usando cache real:', err);
  }

  // Fallback para ordens reais gravadas localmente
  const vehicles = getLocalRealVehicles();
  let orders = getLocalRealOrders().map(order => {
    const vehicle = vehicles.find(v => v.id === order.vehicle_id);
    return { ...order, vehicle: order.vehicle || vehicle };
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

  // Gera número sequencial anual único ("ABAST-YYYY-XXXX")
  const currentYear = new Date().getFullYear();
  const allOrders = getLocalRealOrders();
  const yearOrders = allOrders.filter(o => o.order_number.startsWith(`ABAST-${currentYear}`));
  const nextSeq = yearOrders.length + 1;
  const orderNumber = `ABAST-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

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
  type: 'receipt' | 'odometer' | 'invoice'
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const cleanFileName = `canhotos/${orderId}_${type}_${Date.now()}.${ext}`;

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(cleanFileName, file, { upsert: true });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(cleanFileName);

      const publicUrl = publicUrlData.publicUrl;

      const fieldMap: Record<string, string> = {
        receipt: 'receipt_attachment_url',
        odometer: 'odometer_photo_url',
        invoice: 'invoice_attachment_url'
      };

      await supabase.from('fuel_supply_orders').update({
        [fieldMap[type]]: publicUrl
      }).eq('id', orderId);

      const orders = getLocalRealOrders();
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        (orders[idx] as any)[fieldMap[type]] = publicUrl;
        saveLocalRealOrders(orders);
      }

      return publicUrl;
    }
  } catch (err) {
    console.warn('[FleetFuel] Fallback para DataURL:', err);
  }

  // Fallback DataURL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fieldMap: Record<string, string> = {
        receipt: 'receipt_attachment_url',
        odometer: 'odometer_photo_url',
        invoice: 'invoice_attachment_url'
      };
      const orders = getLocalRealOrders();
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        (orders[idx] as any)[fieldMap[type]] = dataUrl;
        saveLocalRealOrders(orders);
      }
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
 * 6. deleteFuelSupplyOrder: Excluir ordem/auditoria de abastecimento (Acesso Administrativo)
 */
export async function deleteFuelSupplyOrder(orderId: string): Promise<boolean> {
  try {
    await supabase.from('fuel_supply_orders').delete().eq('id', orderId);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao excluir ordem no Supabase:', err);
  }

  const orders = getLocalRealOrders();
  const filtered = orders.filter(o => o.id !== orderId);
  saveLocalRealOrders(filtered);
  return true;
}

/**
 * 7. clearAllFuelOrders: Limpar todo o histórico de ordens/auditorias (Acesso Administrativo)
 */
export async function clearAllFuelOrders(institutionId: string = 'inst_1'): Promise<boolean> {
  try {
    await supabase.from('fuel_supply_orders').delete().eq('institution_id', institutionId);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao limpar histórico de ordens no Supabase:', err);
  }

  saveLocalRealOrders([]);
  return true;
}

/**
 * ====================================================================
 * GESTÃO DE MOTORISTAS / CONDUTORES OFICIAIS (fleet_drivers)
 * ====================================================================
 */

export async function getFleetDrivers(filters?: {
  institutionId?: string;
  search?: string;
  department?: string;
}): Promise<FleetDriver[]> {
  try {
    let query = supabase.from('fleet_drivers').select('*');
    if (filters?.institutionId) {
      query = query.eq('institution_id', filters.institutionId);
    }
    if (filters?.department && filters.department !== 'all') {
      query = query.eq('department', filters.department);
    }
    const { data, error } = await query.order('full_name', { ascending: true });
    if (!error && data && data.length > 0) {
      saveLocalDrivers(data as FleetDriver[]);
      return data as FleetDriver[];
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao consultar motoristas no Supabase:', err);
  }

  let list = getLocalDrivers();
  if (filters?.department && filters.department !== 'all') {
    list = list.filter(d => d.department === filters.department);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(d => d.full_name.toLowerCase().includes(q) || d.cpf.includes(q));
  }
  return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function createFleetDriver(payload: NewDriverPayload): Promise<FleetDriver> {
  const newDriver: FleetDriver = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `drv-${Date.now()}`,
    institution_id: payload.institution_id || 'inst_1',
    full_name: payload.full_name.trim(),
    cpf: payload.cpf.trim(),
    birth_date: payload.birth_date || undefined,
    department: payload.department.trim(),
    cnh_number: payload.cnh_number?.trim() || undefined,
    cnh_category: payload.cnh_category?.trim() || undefined,
    status: payload.status || 'ativo',
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('fleet_drivers').insert([newDriver]).select().single();
    if (!error && data) {
      const list = getLocalDrivers();
      list.unshift(data as FleetDriver);
      saveLocalDrivers(list);
      return data as FleetDriver;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao gravar motorista no Supabase:', err);
  }

  const list = getLocalDrivers();
  list.unshift(newDriver);
  saveLocalDrivers(list);
  return newDriver;
}

export async function updateFleetDriver(id: string, updates: Partial<FleetDriver>): Promise<FleetDriver> {
  const updatedPayload = { ...updates, updated_at: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from('fleet_drivers').update(updatedPayload).eq('id', id).select().single();
    if (!error && data) {
      const list = getLocalDrivers();
      const idx = list.findIndex(d => d.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
        saveLocalDrivers(list);
      }
      return data as FleetDriver;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao atualizar motorista no Supabase:', err);
  }

  const list = getLocalDrivers();
  const idx = list.findIndex(d => d.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updatedPayload };
    saveLocalDrivers(list);
    return list[idx];
  }
  throw new Error('Motorista não encontrado para atualização.');
}

export async function deleteFleetDriver(id: string): Promise<boolean> {
  try {
    await supabase.from('fleet_drivers').delete().eq('id', id);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao excluir motorista no Supabase:', err);
  }
  const list = getLocalDrivers();
  const filtered = list.filter(d => d.id !== id);
  saveLocalDrivers(filtered);
  return true;
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
  try {
    let query = supabase.from('fleet_fuel_stations').select('*');
    if (filters?.institutionId) {
      query = query.eq('institution_id', filters.institutionId);
    }
    const { data, error } = await query.order('name', { ascending: true });
    if (!error && data && data.length > 0) {
      saveLocalStations(data as FleetFuelStation[]);
      return data as FleetFuelStation[];
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao consultar postos no Supabase:', err);
  }

  let list = getLocalStations();
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(s => s.name.toLowerCase().includes(q) || (s.cnpj && s.cnpj.includes(q)));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createFleetFuelStation(payload: NewStationPayload): Promise<FleetFuelStation> {
  const newStation: FleetFuelStation = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sta-${Date.now()}`,
    institution_id: payload.institution_id || 'inst_1',
    name: payload.name.trim(),
    cnpj: payload.cnpj?.trim() || undefined,
    address: payload.address?.trim() || undefined,
    city: payload.city?.trim() || undefined,
    phone: payload.phone?.trim() || undefined,
    status: payload.status || 'ativo',
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('fleet_fuel_stations').insert([newStation]).select().single();
    if (!error && data) {
      const list = getLocalStations();
      list.unshift(data as FleetFuelStation);
      saveLocalStations(list);
      return data as FleetFuelStation;
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao gravar posto no Supabase:', err);
  }

  const list = getLocalStations();
  list.unshift(newStation);
  saveLocalStations(list);
  return newStation;
}

export async function updateFleetFuelStation(id: string, updates: Partial<FleetFuelStation>): Promise<FleetFuelStation> {
  const updatedPayload = { ...updates, updated_at: new Date().toISOString() };
  try {
    const { data, error } = await supabase.from('fleet_fuel_stations').update(updatedPayload).eq('id', id).select().single();
    if (!error && data) {
      const list = getLocalStations();
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

  const list = getLocalStations();
  const idx = list.findIndex(s => s.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updatedPayload };
    saveLocalStations(list);
    return list[idx];
  }
  throw new Error('Posto credenciado não encontrado para atualização.');
}

export async function deleteFleetFuelStation(id: string): Promise<boolean> {
  try {
    await supabase.from('fleet_fuel_stations').delete().eq('id', id);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao excluir posto no Supabase:', err);
  }
  const list = getLocalStations();
  const filtered = list.filter(s => s.id !== id);
  saveLocalStations(filtered);
  return true;
}

