/**
 * Módulo de Controle e Auditoria de Abastecimento de Frotas
 * Camada de API, Serviços e Motor de Validação Antifraude
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

const STORAGE_KEY_VEHICLES = 'gestao360_fleet_vehicles';
const STORAGE_KEY_ORDERS = 'gestao360_fuel_supply_orders';
const BUCKET_NAME = 'fleet-fuel-receipts';

// Dados iniciais de demonstração (Seed)
const INITIAL_VEHICLES: FleetVehicle[] = [
  {
    id: 'veh-001',
    institution_id: 'default',
    plate: 'BRA-2E19',
    prefix_code: 'AMB-04',
    model: 'Mercedes-Benz Sprinter 416 (SAMU)',
    department: 'Saúde',
    fuel_type: 'diesel_s10',
    tank_capacity: 75.0,
    metric_type: 'km',
    expected_consumption: 9.5,
    current_odometer: 42580,
    status: 'ativo',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'veh-002',
    institution_id: 'default',
    plate: 'BRA-9A42',
    prefix_code: 'RETRO-02',
    model: 'Caterpillar 416F2 (Retroescavadeira)',
    department: 'Obras',
    fuel_type: 'diesel_s500',
    tank_capacity: 160.0,
    metric_type: 'horimetro',
    expected_consumption: 8.0,
    current_odometer: 3420,
    status: 'ativo',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString()
  },
  {
    id: 'veh-003',
    institution_id: 'default',
    plate: 'RSG-3H88',
    prefix_code: 'ESC-12',
    model: 'Marcopolo Volare V8L (Ônibus Escolar)',
    department: 'Educação',
    fuel_type: 'diesel_s10',
    tank_capacity: 150.0,
    metric_type: 'km',
    expected_consumption: 5.2,
    current_odometer: 68910,
    status: 'ativo',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString()
  },
  {
    id: 'veh-004',
    institution_id: 'default',
    plate: 'KLI-7F33',
    prefix_code: 'ADM-01',
    model: 'Toyota Hilux 4x4 (Fiscalização Geral)',
    department: 'Administração',
    fuel_type: 'diesel_s10',
    tank_capacity: 80.0,
    metric_type: 'km',
    expected_consumption: 10.8,
    current_odometer: 31200,
    status: 'ativo',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 'veh-005',
    institution_id: 'default',
    plate: 'MUN-4C55',
    prefix_code: 'COLET-03',
    model: 'Volkswagen Constellation 17.280 (Coletor)',
    department: 'Serviços Públicos',
    fuel_type: 'diesel_s10',
    tank_capacity: 275.0,
    metric_type: 'km',
    expected_consumption: 3.1,
    current_odometer: 95430,
    status: 'ativo',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString()
  }
];

const INITIAL_ORDERS: FuelSupplyOrder[] = [
  {
    id: 'ord-001',
    institution_id: 'default',
    order_number: 'ABAST-2026-0001',
    vehicle_id: 'veh-001',
    driver_name: 'Carlos Alberto Ferreira',
    driver_document: '849.201.554-00',
    station_name: 'Auto Posto Central Municipal Ltda',
    fuel_type: 'diesel_s10',
    liters_authorized: 60.0,
    liters_supplied: 58.5,
    previous_odometer: 42020,
    current_odometer: 42580,
    calculated_consumption: 9.57, // (42580 - 42020) / 58.5 = 560 / 58.5 = 9.57 km/l
    unit_price: 6.19,
    total_value: 362.12,
    invoice_number: 'NF-e 004821',
    invoice_key: '51260403849201000155550010000048211928374821',
    receipt_attachment_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
    odometer_photo_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    invoice_attachment_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800',
    is_anomaly: false,
    status: 'auditado',
    audit_justification: 'Conferido com o relatório do sistema de rastreamento veicular e canhoto físico assinado.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'ord-002',
    institution_id: 'default',
    order_number: 'ABAST-2026-0002',
    vehicle_id: 'veh-003',
    driver_name: 'Antônio Marcos da Silva',
    driver_document: 'Matrícula 4091',
    station_name: 'Auto Posto Central Municipal Ltda',
    fuel_type: 'diesel_s10',
    liters_authorized: 120.0,
    previous_odometer: 68910,
    current_odometer: 68910,
    status: 'autorizado',
    is_anomaly: false,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString()
  },
  {
    id: 'ord-003',
    institution_id: 'default',
    order_number: 'ABAST-2026-0003',
    vehicle_id: 'veh-004',
    driver_name: 'João Pedro de Souza',
    driver_document: '219.840.111-92',
    station_name: 'Posto Rota das Águas',
    fuel_type: 'diesel_s10',
    liters_authorized: 70.0,
    liters_supplied: 78.0, // Tanque é 80L, mas abasteceu 78L rodando apenas 210km -> consumo 2.69 km/l (esperado 10.8 km/l)
    previous_odometer: 31200,
    current_odometer: 31410,
    calculated_consumption: 2.69,
    unit_price: 6.25,
    total_value: 487.50,
    invoice_number: 'NFC-e 1198',
    invoice_key: '51260403849201000155550010000011981928374822',
    receipt_attachment_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
    is_anomaly: true,
    anomaly_reason: 'Desvio crítico de consumo médio: 2.69 km/l apurado vs 10.80 km/l esperado (-75.1% de desvio). Suspeita de desvio de combustível.',
    status: 'glosado',
    audit_justification: 'Despesa GLOSADA pelo Controle Interno. Solicitado parecer e abertura de procedimento de apuração com o gestor do setor.',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Funções auxiliares para LocalStorage
function getLocalVehicles(): FleetVehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VEHICLES);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(INITIAL_VEHICLES));
  return INITIAL_VEHICLES;
}

function saveLocalVehicles(vehicles: FleetVehicle[]) {
  try {
    localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
  } catch {}
}

function getLocalOrders(): FuelSupplyOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(INITIAL_ORDERS));
  return INITIAL_ORDERS;
}

function saveLocalOrders(orders: FuelSupplyOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch {}
}

/**
 * 1. getFleetVehicles: Lista veículos ativos, capacidade e odômetro atual
 */
export async function getFleetVehicles(department?: string): Promise<FleetVehicle[]> {
  try {
    let query = supabase.from('fleet_vehicles').select('*');
    if (department && department !== 'all') {
      query = query.eq('department', department);
    }
    const { data, error } = await query.order('plate', { ascending: true });
    if (!error && data && data.length > 0) {
      saveLocalVehicles(data as FleetVehicle[]);
      return data as FleetVehicle[];
    }
  } catch (err) {
    console.warn('[FleetFuel] Falha ao consultar Supabase, utilizando fallback local:', err);
  }

  // Fallback Local
  const local = getLocalVehicles();
  if (department && department !== 'all') {
    return local.filter(v => v.department === department);
  }
  return local;
}

/**
 * Cadastrar novo veículo na frota
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
      const local = getLocalVehicles();
      local.unshift(data as FleetVehicle);
      saveLocalVehicles(local);
      return data as FleetVehicle;
    }
  } catch (err) {
    console.warn('[FleetFuel] Falha ao gravar veículo no Supabase, salvando localmente:', err);
  }

  const local = getLocalVehicles();
  local.unshift(newVehicle);
  saveLocalVehicles(local);
  return newVehicle;
}

/**
 * Atualizar dados do veículo (ex: odômetro atualizado após abastecimento)
 */
export async function updateFleetVehicle(id: string, updates: Partial<FleetVehicle>): Promise<void> {
  try {
    await supabase.from('fleet_vehicles').update(updates).eq('id', id);
  } catch (err) {
    console.warn('[FleetFuel] Erro ao atualizar veículo no Supabase:', err);
  }

  const local = getLocalVehicles();
  const index = local.findIndex(v => v.id === id);
  if (index !== -1) {
    local[index] = { ...local[index], ...updates };
    saveLocalVehicles(local);
  }
}

/**
 * Listar ordens de abastecimento com filtros
 */
export async function getFuelSupplyOrders(filters?: {
  status?: string;
  department?: string;
  onlyAnomalies?: boolean;
}): Promise<FuelSupplyOrder[]> {
  try {
    let query = supabase.from('fuel_supply_orders').select(`
      *,
      vehicle:fleet_vehicles(*)
    `);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.onlyAnomalies) {
      query = query.eq('is_anomaly', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      saveLocalOrders(data as FuelSupplyOrder[]);
      return data as FuelSupplyOrder[];
    }
  } catch (err) {
    console.warn('[FleetFuel] Falha ao consultar ordens no Supabase, utilizando fallback local:', err);
  }

  // Fallback Local
  const vehicles = getLocalVehicles();
  let orders = getLocalOrders().map(order => {
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
 * 2. createFuelOrder: Emissão de Ordem com validação bloqueante de capacidade de tanque
 */
export async function createFuelOrder(orderData: NewFuelOrderPayload): Promise<FuelSupplyOrder> {
  const vehicles = await getFleetVehicles();
  const vehicle = vehicles.find(v => v.id === orderData.vehicle_id);

  if (!vehicle) {
    throw new Error('Veículo informado não foi localizado no cadastro da frota.');
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

  // Gera número sequencial sequenciado ("ABAST-YYYY-XXXX")
  const currentYear = new Date().getFullYear();
  const allOrders = getLocalOrders();
  const yearOrders = allOrders.filter(o => o.order_number.startsWith(`ABAST-${currentYear}`));
  const nextSeq = yearOrders.length + 1;
  const orderNumber = `ABAST-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

  const newOrder: FuelSupplyOrder = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`,
    institution_id: orderData.institution_id || vehicle.institution_id || 'default',
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
      is_anomaly: false,
      status: 'autorizado'
    }]).select().single();

    if (!error && data) {
      const orders = getLocalOrders();
      orders.unshift({ ...newOrder, ...data, vehicle });
      saveLocalOrders(orders);
      return { ...newOrder, ...data, vehicle };
    }
  } catch (err) {
    console.warn('[FleetFuel] Erro ao gravar ordem no Supabase, salvando localmente:', err);
  }

  const orders = getLocalOrders();
  orders.unshift(newOrder);
  saveLocalOrders(orders);
  return newOrder;
}

/**
 * 3. registerFuelExecution: Registro de execução com motor de cálculo e detecção de anomalias
 */
export async function registerFuelExecution(
  orderId: string,
  executionData: FuelExecutionPayload
): Promise<FuelSupplyOrder> {
  const orders = getLocalOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);

  if (orderIndex === -1) {
    throw new Error('Ordem de abastecimento não encontrada.');
  }

  const order = orders[orderIndex];
  const vehicles = await getFleetVehicles();
  const vehicle = vehicles.find(v => v.id === order.vehicle_id) || order.vehicle;

  if (!vehicle) {
    throw new Error('Veículo associado à ordem não foi localizado.');
  }

  const litersSupplied = Number(executionData.liters_supplied);
  const currentOdometer = Number(executionData.current_odometer);
  const previousOdometer = Number(order.previous_odometer);
  const unitPrice = Number(executionData.unit_price);
  const totalValue = Number((litersSupplied * unitPrice).toFixed(2));

  if (litersSupplied <= 0) {
    throw new Error('A litragem real abastecida deve ser maior que zero.');
  }

  // 1. Cálculo de consumo
  // Veículo em km: (odômetro atual - anterior) / litros reais
  // Máquina em horímetro: (horímetro atual - anterior) / litros reais
  const deltaOdometer = currentOdometer - previousOdometer;
  let calculatedConsumption: number = 0;

  if (deltaOdometer > 0 && litersSupplied > 0) {
    calculatedConsumption = Number((deltaOdometer / litersSupplied).toFixed(2));
  }

  // 2. MOTOR DE VALIDAÇÃO DE ANOMALIAS
  const anomalies: string[] = [];

  // Regra A: Odômetro/Horímetro violado ou regressivo
  if (currentOdometer <= previousOdometer) {
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

  const isAnomaly = anomalies.length > 0;
  const anomalyReason = isAnomaly ? anomalies.join(' | ') : undefined;

  const updatedOrder: FuelSupplyOrder = {
    ...order,
    liters_supplied: litersSupplied,
    current_odometer: currentOdometer,
    calculated_consumption: calculatedConsumption,
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
  saveLocalOrders(orders);
  return updatedOrder;
}

/**
 * 4. uploadReceiptAttachment: Upload seguro de comprovante para o Supabase Storage com fallback
 */
export async function uploadReceiptAttachment(
  orderId: string,
  file: File,
  type: 'receipt' | 'odometer' | 'invoice'
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const cleanFileName = `${orderId}/${type}_${Date.now()}.${ext}`;

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(cleanFileName, file, { upsert: true });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(cleanFileName);

      const publicUrl = publicUrlData.publicUrl;

      // Gravar URL na ordem
      const fieldMap: Record<string, string> = {
        receipt: 'receipt_attachment_url',
        odometer: 'odometer_photo_url',
        invoice: 'invoice_attachment_url'
      };

      await supabase.from('fuel_supply_orders').update({
        [fieldMap[type]]: publicUrl
      }).eq('id', orderId);

      // Atualizar local
      const orders = getLocalOrders();
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        (orders[idx] as any)[fieldMap[type]] = publicUrl;
        saveLocalOrders(orders);
      }

      return publicUrl;
    }
  } catch (err) {
    console.warn('[FleetFuel] Falha no upload para Supabase Storage, gerando DataURL local:', err);
  }

  // Fallback DataURL para funcionamento offline
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fieldMap: Record<string, string> = {
        receipt: 'receipt_attachment_url',
        odometer: 'odometer_photo_url',
        invoice: 'invoice_attachment_url'
      };
      const orders = getLocalOrders();
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        (orders[idx] as any)[fieldMap[type]] = dataUrl;
        saveLocalOrders(orders);
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
  const orders = getLocalOrders();
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
  saveLocalOrders(orders);
  return updatedOrder;
}
