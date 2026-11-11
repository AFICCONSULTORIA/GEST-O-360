/**
 * Painel Principal de Controle e Auditoria de Abastecimento de Frotas
 * Em conformidade com o Tribunal de Contas do Estado (TCE) e Normas de Liquidação Pública
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Upload,
  FileText,
  X,
  AlertCircle,
  Ban,
  Gauge,
  Layers,
  FileCheck,
  RefreshCw,
  Building2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  CheckSquare,
  Car,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  MapPin,
  Store,
  Calendar,
  CreditCard,
  Clock,
  Sliders,
  DollarSign,
  Receipt,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Camera,
  CloudUpload,
  Bell,
  BellRing,
  CheckCheck,
  RotateCcw
} from 'lucide-react';
import {
  FleetVehicle,
  FleetBudgetClassification,
  FuelSupplyOrder,
  FuelType,
  MetricType,
  FleetDriver,
  FleetFuelStation,
  getFleetVehicles,
  getFleetBudgetClassifications,
  getFuelSupplyOrders,
  createFuelOrder,
  registerFuelExecution,
  uploadReceiptAttachment,
  auditFuelOrder,
  createFleetVehicle,
  updateFleetVehicle,
  deleteFleetVehicle,
  clearAllFleetVehicles,
  deleteFuelSupplyOrder,
  clearAllFuelOrders,
  syncVehiclesFromPatrimonio,
  getFleetDrivers,
  createFleetDriver,
  updateFleetDriver,
  deleteFleetDriver,
  clearAllFleetDrivers,
  getFleetFuelStations,
  createFleetFuelStation,
  updateFleetFuelStation,
  deleteFleetFuelStation,
  clearAllFleetFuelStations,
  syncLocalDriversAndStationsToSupabase,
  toBudgetUUID,
  getNextOrderNumber7Digits,
  formatOrderNumber7Digits
} from '../../../lib/api/fleetFuel';
import { imprimirOrdemAbastecimento } from './OrdemAbastecimentoPDF';
import { imprimirCanhotoDuasVias, formatFuelLabel } from './FuelAuthorizationVoucherPDF';
import { DriverBatchImporter } from './DriverBatchImporter';
import { BudgetClassificationsModal } from './BudgetClassificationsModal';
import { LegacyVoucherModal } from './LegacyVoucherModal';
import { MercosulPlate } from './MercosulPlate';
import { useMunicipalDepartments, matchOfficialDepartmentName } from '../../../lib/api/departments';
import { 
  CONTRACTUAL_BIDDED_PRICES, 
  issueFuelAuthorization,
  getBiddedFuelPrices,
  getBiddedFuelPricesFromSupabase,
  saveBiddedFuelPrices,
  BiddedPricesMap,
  validateAndCompleteFuelOrder,
  calculateRealtimeMetrics,
  uploadFuelDocumentPhoto,
  linkInvoiceToFuelOrder,
  syncLocalOrdersToSupabase,
  updateFuelOrderBudgetClassification,
  cancelFuelOrderHomologation
} from '../../../lib/api/fleetFuelAudit';
import { formatCPF, formatThousands, parseThousands } from '../../../lib/masks';
import { exportToExcel } from '../../../lib/excelExport';
import { showToast } from '../../../components/ui/Toast';
import { playFuelAlertChime, sendDesktopNotification } from '../../../utils/soundAlert';
import { AdminUser } from '../../../types';
import { supabase } from '../../../lib/supabase';

export interface FleetNotification {
  id: string;
  orderId?: string;
  orderNumber: string;
  type: 'abastecimento' | 'alerta_auditoria' | 'bloqueio_tce' | 'ordem_emitida';
  title: string;
  message: string;
  plate?: string;
  vehicleModel?: string;
  driverName?: string;
  stationName?: string;
  liters?: number;
  currentOdometer?: number;
  pumpPhotoUrl?: string;
  odometerPhotoUrl?: string;
  timestamp: string;
  read: boolean;
  hasPhotos: boolean;
  anomalyLevel?: 'none' | 'alerta_amarelo' | 'bloqueio_critico';
  anomalyReason?: string;
}

function formatRelativeNotificationTime(dateIso: string): string {
  try {
    const d = new Date(dateIso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return 'Agora';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24 && now.getDate() === d.getDate()) {
      return `Hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth()) {
      return `Ontem às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recente';
  }
}

export function resolveOrderBudget(
  order?: Partial<FuelSupplyOrder> | null,
  vehicle?: FleetVehicle | null,
  budgetClassifications: FleetBudgetClassification[] = []
): FleetBudgetClassification | undefined {
  if (!order && !vehicle) return undefined;
  
  // 1. Objeto budget_classification direto na ordem
  if (order?.budget_classification && (order.budget_classification as any).invoice_sheet) {
    return order.budget_classification as FleetBudgetClassification;
  }
  
  // 2. ID ou número da ficha na ordem
  if (order?.budget_classification_id) {
    const match = budgetClassifications.find(b => 
      b.id === order.budget_classification_id || 
      b.invoice_sheet === order.budget_classification_id ||
      b.id === toBudgetUUID(String(order.budget_classification_id))
    );
    if (match) return match;
  }
  
  // 3. ID ou ficha no veículo
  const v = vehicle || order?.vehicle;
  if (v?.budget_classification_id) {
    const match = budgetClassifications.find(b => 
      b.id === v.budget_classification_id || 
      b.invoice_sheet === v.budget_classification_id ||
      b.id === toBudgetUUID(String(v.budget_classification_id))
    );
    if (match) return match;
  }
  
  // 4. Objeto no veículo
  if (v?.budget_classification && (v.budget_classification as any).invoice_sheet) {
    return v.budget_classification as FleetBudgetClassification;
  }
  
  return undefined;
}

/**
 * Resolução segura e à prova de falhas dos valores financeiros da ordem (evita NaN)
 */
export function resolveOrderFinancials(
  order: Partial<FuelSupplyOrder> | null | undefined,
  biddedPricesMap?: BiddedPricesMap
): {
  unitPrice: number;
  effectiveLiters: number;
  effectiveValue: number;
  formattedValue: string;
  formattedUnitPrice: string;
} {
  if (!order) {
    return {
      unitPrice: 6.19,
      effectiveLiters: 0,
      effectiveValue: 0,
      formattedValue: 'R$ 0,00',
      formattedUnitPrice: 'R$ 6,19'
    };
  }

  const isSupplied = order.status !== 'autorizado' && order.status !== 'autorizado_pendente';
  const rawLiters = isSupplied && order.liters_supplied ? order.liters_supplied : order.liters_authorized;
  const numLiters = Number(rawLiters);
  const effectiveLiters = !isNaN(numLiters) && numLiters > 0 ? numLiters : 0;

  // Preço unitário contratual com fallback seguro por combustível
  const fuelKey = order.fuel_type as FuelType;
  const priceFromConfig = fuelKey && biddedPricesMap?.[fuelKey]?.price ? Number(biddedPricesMap[fuelKey].price) : undefined;
  const priceFromContractual = fuelKey && CONTRACTUAL_BIDDED_PRICES[fuelKey]?.price ? Number(CONTRACTUAL_BIDDED_PRICES[fuelKey].price) : undefined;

  let unitPrice = 0;
  const orderBiddedPrice = Number((order as any)?.bidded_unit_price);
  const orderUnitPrice = Number(order.unit_price);

  if (!isNaN(orderBiddedPrice) && orderBiddedPrice > 0) {
    unitPrice = orderBiddedPrice;
  } else if (!isNaN(orderUnitPrice) && orderUnitPrice > 0) {
    unitPrice = orderUnitPrice;
  } else if (typeof priceFromConfig === 'number' && !isNaN(priceFromConfig) && priceFromConfig > 0) {
    unitPrice = priceFromConfig;
  } else if (typeof priceFromContractual === 'number' && !isNaN(priceFromContractual) && priceFromContractual > 0) {
    unitPrice = priceFromContractual;
  } else {
    unitPrice = 6.19;
  }

  if (isNaN(unitPrice) || unitPrice <= 0) unitPrice = 6.19;

  // Valor total apurado com fallback seguro
  const orderTotalValue = Number(order.total_value);
  const orderTotalAuth = Number((order as any)?.total_authorized_value);

  let effectiveValue = 0;
  if (!isNaN(orderTotalValue) && orderTotalValue > 0) {
    effectiveValue = orderTotalValue;
  } else if (!isNaN(orderTotalAuth) && orderTotalAuth > 0) {
    effectiveValue = orderTotalAuth;
  } else {
    effectiveValue = Number((effectiveLiters * unitPrice).toFixed(2));
  }

  if (isNaN(effectiveValue) || effectiveValue < 0) effectiveValue = 0;

  return {
    unitPrice,
    effectiveLiters,
    effectiveValue,
    formattedValue: effectiveValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    formattedUnitPrice: `R$ ${unitPrice.toFixed(2)}`
  };
}

interface FleetFuelManagerProps {
  currentUser?: AdminUser | null;
}

export const FleetFuelManager: React.FC<FleetFuelManagerProps> = ({ currentUser }) => {
  // Estado das Abas
  const [activeTab, setActiveTab] = useState<'orders' | 'execution' | 'audit' | 'vehicles' | 'drivers' | 'stations'>('orders');

  // Dados
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [orders, setOrders] = useState<FuelSupplyOrder[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [stations, setStations] = useState<FleetFuelStation[]>([]);
  const [budgetClassifications, setBudgetClassifications] = useState<FleetBudgetClassification[]>([]);
  const sortedBudgetClassifications = useMemo(() => {
    return [...budgetClassifications].sort((a, b) => (parseInt(a.invoice_sheet, 10) || 0) - (parseInt(b.invoice_sheet, 10) || 0));
  }, [budgetClassifications]);
  const [isDriverBatchModalOpen, setIsDriverBatchModalOpen] = useState(false);
  const [isBudgetClassificationsModalOpen, setIsBudgetClassificationsModalOpen] = useState(false);
  const [attachmentViewMode, setAttachmentViewMode] = useState<'side_by_side' | 'grid'>('side_by_side');
  const [selectedAttachmentPhoto, setSelectedAttachmentPhoto] = useState<'pump' | 'odometer' | 'receipt' | 'invoice'>('pump');
  const [loading, setLoading] = useState(true);

  // Notificações Minimalistas da Frota (focadas exclusivamente em abastecimentos no posto com fotos da bomba/odômetro)
  const [notifications, setNotifications] = useState<FleetNotification[]>(() => {
    try {
      const instId = currentUser?.institution_id || 'inst_1';
      const raw = localStorage.getItem(`gestao360_fleet_station_notifs_v2_${instId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'abastecimento' | 'alerta'>('all');
  const [bellAnimate, setBellAnimate] = useState(false);
  const notificationDropdownRef = React.useRef<HTMLDivElement>(null);
  const notifiedStationEventsRef = React.useRef<Record<string, number>>({});

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driverSearchTerm, setDriverSearchTerm] = useState('');
  const [stationSearchTerm, setStationSearchTerm] = useState('');

  // Ordenação por Número da Ordem ('none' | 'asc' | 'desc')
  const [orderNumberSort, setOrderNumberSort] = useState<'none' | 'asc' | 'desc'>('none');

  const toggleOrderNumberSort = () => {
    setOrderNumberSort(prev => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  // Paginação (30 itens por página)
  const ITEMS_PER_PAGE = 30;
  const [currentPage, setCurrentPage] = useState(1);

  // Tabela Dinâmica de Preços Licitados & Reequilíbrio Econômico-Financeiro
  const [biddedPrices, setBiddedPrices] = useState<BiddedPricesMap>(() => {
    return getBiddedFuelPrices(currentUser?.institution_id);
  });
  const [isPriceConfigModalOpen, setIsPriceConfigModalOpen] = useState(false);
  const [priceEditForm, setPriceEditForm] = useState<BiddedPricesMap>(biddedPrices);
  const [rebalanceReasonInput, setRebalanceReasonInput] = useState('');
  const [rebalanceTermInput, setRebalanceTermInput] = useState('Termo Aditivo nº 02/2026 - Reequilíbrio ANP');

  // Modais
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isLegacyVoucherModalOpen, setIsLegacyVoucherModalOpen] = useState(false);
  const [newOrderStep, setNewOrderStep] = useState<1 | 2 | 3>(1);
  const [vehicleSearchFilter, setVehicleSearchFilter] = useState('');
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [showGlossReasonBox, setShowGlossReasonBox] = useState(false);
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [isLinkInvoiceModalOpen, setIsLinkInvoiceModalOpen] = useState(false);
  const [invoiceLinkOrder, setInvoiceLinkOrder] = useState<FuelSupplyOrder | null>(null);
  const [invoiceLinkNumber, setInvoiceLinkNumber] = useState('');
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<FuelSupplyOrder | null>(null);
  const [viewingAttachmentOrder, setViewingAttachmentOrder] = useState<FuelSupplyOrder | null>(null);

  // Formulário: Nova Ordem
  const [newOrderForm, setNewOrderForm] = useState({
    custom_order_number: '',
    vehicle_id: '',
    driver_name: '',
    driver_document: '',
    station_name: 'Auto Posto Central Municipal Ltda',
    fuel_type: 'diesel_s10' as FuelType,
    liters_authorized: 50,
    current_odometer: 0,
    budget_classification_id: '',
    supply_mode: 'litragem_fixa' as 'litragem_fixa' | 'encher_tanque',
    authorized_by_name: currentUser?.name || 'Gestor da Frota Municipal',
    authorized_by_role: 'Secretário / Responsável pela Frota',
    is_full_tank_order: false,
    emergency_call_reason: ''
  });

  // Formulário: Lançamento de Canhoto / Execução
  const [executionForm, setExecutionForm] = useState({
    custom_order_number: '',
    liters_supplied: 0,
    current_odometer: 0,
    unit_price: 6.19,
    invoice_number: '',
    invoice_key: '',
    receipt_attachment_url: '',
    odometer_photo_url: '',
    pump_photo_url: '',
    invoice_attachment_url: '',
    budget_classification_id: ''
  });

  // Estado para Edição Rápida de Ficha Orçamentária da Ordem
  const [orderForBudgetEdit, setOrderForBudgetEdit] = useState<FuelSupplyOrder | null>(null);
  const [budgetEditId, setBudgetEditId] = useState('');
  const [savingOrderBudget, setSavingOrderBudget] = useState(false);

  // Estado para Edição de Ficha dentro do Visualizador de Detalhes / Fotos
  const [isEditingViewerBudget, setIsEditingViewerBudget] = useState(false);
  const [viewerBudgetId, setViewerBudgetId] = useState('');
  const [savingViewerBudget, setSavingViewerBudget] = useState(false);

  // Formulário: Auditoria e Glosa
  const [auditForm, setAuditForm] = useState({
    status: 'auditado' as 'auditado' | 'glosado',
    justification: ''
  });

  // Formulário: Novo Veículo
  const [newVehicleForm, setNewVehicleForm] = useState({
    plate: '',
    prefix_code: '',
    model: '',
    department: 'Saúde',
    fuel_type: 'diesel_s10' as FuelType,
    tank_capacity: 70,
    metric_type: 'km' as MetricType,
    expected_consumption: 9.0,
    current_odometer: 0,
    budget_classification_id: '',
    always_full_tank: false,
    is_emergency_priority: false
  });

  // Estado para Edição de Veículo
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState({
    plate: '',
    prefix_code: '',
    model: '',
    department: '',
    fuel_type: 'diesel_s10' as FuelType,
    tank_capacity: 70,
    metric_type: 'km' as MetricType,
    expected_consumption: 9.0,
    current_odometer: 0,
    status: 'ativo' as 'ativo' | 'manutencao' | 'baixado' | 'inativo',
    budget_classification_id: '',
    always_full_tank: false,
    is_emergency_priority: false
  });

  // Secretarias Oficiais do Município (Fonte única sincronizada com todo o sistema)
  const {
    departments: municipalDepartmentRecords,
    departmentNames: officialDepartments,
    addDepartment: addMunicipalDepartment,
    removeDepartment: removeMunicipalDepartment
  } = useMunicipalDepartments(currentUser?.institution_id);
  const [isDepartmentsModalOpen, setIsDepartmentsModalOpen] = useState(false);
  const [newDepartmentNameInput, setNewDepartmentNameInput] = useState('');
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [standardizingDepartments, setStandardizingDepartments] = useState(false);

  // Estado para Gestão de Motoristas
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [isEditDriverModalOpen, setIsEditDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<FleetDriver | null>(null);
  const [driverForm, setDriverForm] = useState({
    full_name: '',
    cpf: '',
    birth_date: '',
    department: '',
    cnh_number: '',
    cnh_category: 'B',
    status: 'ativo' as 'ativo' | 'inativo' | 'afastado'
  });

  useEffect(() => {
    if (officialDepartments.length > 0) {
      setDriverForm(prev => (!prev.department ? { ...prev, department: officialDepartments[0] } : prev));
      setNewVehicleForm(prev => (!prev.department || prev.department === 'Saúde' ? { ...prev, department: officialDepartments[0] } : prev));
    }
  }, [officialDepartments]);

  // Estado para Gestão de Postos Credenciados
  const [isNewStationModalOpen, setIsNewStationModalOpen] = useState(false);
  const [isEditStationModalOpen, setIsEditStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<FleetFuelStation | null>(null);
  const [stationForm, setStationForm] = useState({
    name: '',
    cnpj: '',
    address: '',
    city: 'Torixoréu - MT',
    phone: '',
    status: 'ativo' as 'ativo' | 'inativo'
  });

  const [syncingPatrimonio, setSyncingPatrimonio] = useState(false);
  const prevStatusesRef = React.useRef<Record<string, string>>({});
  const prevPhotosRef = React.useRef<Record<string, boolean>>({});

  // Fechar dropdown de notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  // Contagem de notificações não lidas
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Notificações filtradas (minimalistas e sem duplicidade)
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  }, [notifications, notificationFilter]);

  // Sincronização minimalista: foca apenas em abastecimentos no posto com fotos da bomba e odômetro
  const syncNotificationsWithOrders = (ordList: FuelSupplyOrder[], vehList: FleetVehicle[], instId: string) => {
    try {
      const storageKey = `gestao360_fleet_station_notifs_v2_${instId}`;
      const lastVisitKey = `gestao360_fleet_last_visit_v2_${instId}`;

      let currentNotifs: FleetNotification[] = [];
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          currentNotifs = JSON.parse(stored);
        } catch {}
      }

      const rawLastVisit = localStorage.getItem(lastVisitKey);
      const lastVisitTime = rawLastVisit ? new Date(rawLastVisit).getTime() : Date.now() - 24 * 3600 * 1000;

      const existingMap = new Map<string, FleetNotification>();
      currentNotifs.forEach(n => existingMap.set(n.orderNumber || n.id, n));

      const stationNotifs: FleetNotification[] = [];

      ordList.forEach(ord => {
        const isLegacy = Boolean((ord as any).is_legacy_voucher || (ord as any).supply_mode === 'canhoto_legado');
        const hasStationPhotos = Boolean(ord.pump_photo_url || ord.odometer_photo_url);

        // Foca especificamente em abastecimentos no posto que inseriram fotos da bomba/odômetro (ou recém-abastecidos no posto)
        if (isLegacy && !hasStationPhotos) return;
        if (!hasStationPhotos && ord.status !== 'abastecido') return;

        const v = ord.vehicle || vehList.find(item => item.id === ord.vehicle_id);
        const orderTime = ord.supplied_at ? new Date(ord.supplied_at).getTime() : new Date(ord.created_at).getTime();
        const wasWhileOffline = orderTime > lastVisitTime;
        const prevNotif = existingMap.get(ord.order_number);
        const isAlreadyAudited = ord.status === 'auditado' || ord.status === 'glosado';

        stationNotifs.push({
          id: `notif_posto_${ord.order_number}`,
          orderId: ord.id,
          orderNumber: ord.order_number,
          type: 'abastecimento',
          title: hasStationPhotos ? 'Abastecido no Posto • Fotos Recebidas' : 'Abastecimento Registrado no Posto',
          message: `${v?.plate || 'Placa'} • ${v?.model || 'Veículo'} • ${Number(ord.liters_supplied || ord.liters_authorized || 0).toFixed(1)} L`,
          plate: v?.plate,
          vehicleModel: v?.model,
          driverName: ord.driver_name,
          stationName: ord.station_name,
          liters: ord.liters_supplied || ord.liters_authorized,
          currentOdometer: ord.current_odometer,
          pumpPhotoUrl: ord.pump_photo_url,
          odometerPhotoUrl: ord.odometer_photo_url,
          timestamp: ord.supplied_at || ord.created_at || new Date().toISOString(),
          read: isAlreadyAudited ? true : prevNotif ? prevNotif.read : !wasWhileOffline,
          hasPhotos: hasStationPhotos,
          anomalyLevel: ord.anomaly_level,
          anomalyReason: ord.anomaly_reason
        });
      });

      const sorted = stationNotifs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 12);

      localStorage.setItem(storageKey, JSON.stringify(sorted));
      setNotifications(sorted);
      localStorage.setItem(lastVisitKey, new Date().toISOString());
    } catch (err) {
      console.warn('[FleetFuelManager] Erro ao sincronizar notificações:', err);
    }
  };

  // Disparo único e minimalista quando o abastecimento é feito no posto com fotos da bomba e odômetro
  const addRealtimeNotification = (ord: any) => {
    if (!ord) return;
    const orderKey = String(ord.order_number || ord.id || '');
    const hasStationPhotos = Boolean(ord.pump_photo_url || ord.odometer_photo_url);
    const dedupeKey = `${orderKey}_${hasStationPhotos ? 'photos' : 'supply'}`;
    const now = Date.now();

    // Evita disparos repetidos do mesmo evento (Realtime + BroadcastChannel + Polling)
    if (orderKey && notifiedStationEventsRef.current[dedupeKey] && now - notifiedStationEventsRef.current[dedupeKey] < 20000) {
      return;
    }
    if (orderKey) {
      notifiedStationEventsRef.current[dedupeKey] = now;
    }

    const v = ord.vehicle || vehicles.find(item => item.id === ord.vehicle_id);
    const plateLabel = v?.plate || ord.plate || '';
    const litersLabel = Number(ord.liters_supplied || ord.liters_authorized || 0).toFixed(1);

    playFuelAlertChime();
    sendDesktopNotification(
      '⛽ Abastecimento no Posto',
      `${plateLabel ? `${plateLabel} • ` : ''}${litersLabel}L abastecidos. Fotos da bomba e odômetro inseridas.`
    );
    showToast(
      `⛽ ${plateLabel || ord.order_number || 'Veículo'} abastecido no posto (${litersLabel} L)${hasStationPhotos ? ' • Fotos da bomba e odômetro recebidas' : ''}`,
      'success'
    );

    const notifId = `notif_posto_${ord.order_number || now}`;
    const notif: FleetNotification = {
      id: notifId,
      orderId: ord.id,
      orderNumber: ord.order_number || 'Ordem Digital',
      type: 'abastecimento',
      title: hasStationPhotos ? 'Abastecido no Posto • Fotos Recebidas' : 'Abastecimento no Posto',
      message: `${plateLabel || 'Veículo'} • ${v?.model || 'Frota'} • ${litersLabel} L`,
      plate: v?.plate,
      vehicleModel: v?.model,
      driverName: ord.driver_name,
      stationName: ord.station_name,
      liters: ord.liters_supplied || ord.liters_authorized,
      currentOdometer: ord.current_odometer,
      pumpPhotoUrl: ord.pump_photo_url,
      odometerPhotoUrl: ord.odometer_photo_url,
      timestamp: new Date().toISOString(),
      read: false,
      hasPhotos: hasStationPhotos,
      anomalyLevel: ord.anomaly_level,
      anomalyReason: ord.anomaly_reason
    };

    setNotifications(prev => {
      const updated = [notif, ...prev.filter(n => n.id !== notifId && n.orderNumber !== notif.orderNumber)].slice(0, 12);
      const instId = currentUser?.institution_id || 'inst_1';
      try {
        localStorage.setItem(`gestao360_fleet_station_notifs_v2_${instId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setBellAnimate(true);
    setTimeout(() => setBellAnimate(false), 1800);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      const instId = currentUser?.institution_id || 'inst_1';
      try {
        localStorage.setItem(`gestao360_fleet_station_notifs_v2_${instId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearNotificationHistory = () => {
    const instId = currentUser?.institution_id || 'inst_1';
    setNotifications([]);
    try {
      localStorage.removeItem(`gestao360_fleet_station_notifs_v2_${instId}`);
    } catch {}
  };

  const handleNotificationClick = (notif: FleetNotification) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notif.id ? { ...n, read: true } : n);
      const instId = currentUser?.institution_id || 'inst_1';
      try {
        localStorage.setItem(`gestao360_fleet_station_notifs_v2_${instId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const targetOrder = orders.find(o => o.order_number === notif.orderNumber || o.id === notif.orderId);
    if (targetOrder) {
      openAttachmentViewer(targetOrder, 'pump');
      setIsNotificationOpen(false);
    } else {
      setSearchTerm(notif.orderNumber);
      setIsNotificationOpen(false);
    }
  };

  const openAttachmentViewer = (order: FuelSupplyOrder, preferredTab?: 'pump' | 'odometer' | 'receipt') => {
    const hasPump = Boolean(order.pump_photo_url);
    const hasOdo = Boolean(order.odometer_photo_url);
    const hasReceipt = Boolean(order.receipt_photo_url || order.receipt_attachment_url);

    if (preferredTab) {
      setSelectedAttachmentPhoto(preferredTab);
    } else if (hasReceipt && !hasPump && !hasOdo) {
      setSelectedAttachmentPhoto('receipt');
    } else if (hasPump) {
      setSelectedAttachmentPhoto('pump');
    } else if (hasOdo) {
      setSelectedAttachmentPhoto('odometer');
    } else if (hasReceipt) {
      setSelectedAttachmentPhoto('receipt');
    } else {
      setSelectedAttachmentPhoto('receipt');
    }
    setViewingAttachmentOrder(order);
    const resolvedBc = resolveOrderBudget(order, order.vehicle, budgetClassifications);
    setViewerBudgetId(resolvedBc?.id || order.budget_classification_id || '');
    setIsEditingViewerBudget(false);
  };

  // Carregar dados reais (Veículos, Ordens, Motoristas e Postos)
  const loadData = async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    try {
      const instId = currentUser?.institution_id || 'inst_1';

      const [vehList, ordList, drvList, staList, bclassList, bPrices] = await Promise.all([
        getFleetVehicles(undefined, instId),
        getFuelSupplyOrders({ institutionId: instId }),
        getFleetDrivers({ institutionId: instId }),
        getFleetFuelStations({ institutionId: instId }),
        getFleetBudgetClassifications(instId),
        getBiddedFuelPricesFromSupabase(instId)
      ]);
      setVehicles(vehList);
      setOrders(ordList);
      setDrivers(drvList);
      setStations(staList);
      setBudgetClassifications(bclassList);
      if (bPrices) {
        setBiddedPrices(bPrices);
      }

      // Detectar em tempo real quando o abastecimento é feito no posto e recebe as fotos da bomba e odômetro
      ordList.forEach(ord => {
        const prevStatus = prevStatusesRef.current[ord.id] || prevStatusesRef.current[ord.order_number];
        const prevHadPhotos = prevPhotosRef.current[ord.id];
        const nowHasPhotos = Boolean(ord.pump_photo_url || ord.odometer_photo_url);

        const statusJustSupplied =
          prevStatus &&
          (prevStatus === 'autorizado_pendente' || prevStatus === 'aguardando_abastecimento' || prevStatus === 'autorizado') &&
          ord.status === 'abastecido';

        const photosJustArrived = prevHadPhotos === false && nowHasPhotos;

        if (statusJustSupplied || photosJustArrived) {
          addRealtimeNotification(ord);
        }
        prevStatusesRef.current[ord.id] = ord.status;
        prevStatusesRef.current[ord.order_number] = ord.status;
        prevPhotosRef.current[ord.id] = nowHasPhotos;
      });

      syncNotificationsWithOrders(ordList, vehList, instId);

      setViewingAttachmentOrder(prev => {
        if (!prev) return null;
        return ordList.find(o => o.id === prev.id || o.order_number === prev.order_number) || prev;
      });
    } catch (err) {
      console.error('Erro ao carregar dados de frotas:', err);
      if (!isSilent) showToast('Erro ao carregar dados do módulo de frotas.', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSyncPatrimonio = async () => {
    setSyncingPatrimonio(true);
    try {
      const instId = currentUser?.institution_id || 'inst_1';
      showToast('Sincronizando veículos reais com o cadastro patrimonial...', 'info');
      const synced = await syncVehiclesFromPatrimonio(instId);
      setVehicles(synced);
      showToast(`${synced.length} veículos reais sincronizados com sucesso do patrimônio municipal!`, 'success');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao sincronizar frota com patrimônio.', 'error');
    } finally {
      setSyncingPatrimonio(false);
    }
  };

  const handleOpenEditVehicle = (vehicle: FleetVehicle) => {
    setEditingVehicle(vehicle);
    const resolvedDept = matchOfficialDepartmentName(vehicle.department, officialDepartments) || vehicle.department || officialDepartments[0] || '';
    setEditVehicleForm({
      plate: vehicle.plate,
      prefix_code: vehicle.prefix_code || '',
      model: vehicle.model,
      department: resolvedDept,
      fuel_type: vehicle.fuel_type,
      tank_capacity: vehicle.tank_capacity,
      metric_type: vehicle.metric_type,
      expected_consumption: vehicle.expected_consumption,
      current_odometer: vehicle.current_odometer,
      status: vehicle.status,
      budget_classification_id: vehicle.budget_classification_id || '',
      always_full_tank: !!vehicle.always_full_tank,
      is_emergency_priority: !!vehicle.is_emergency_priority
    });
    setIsEditVehicleModalOpen(true);
  };

  const handleSaveEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    try {
      const updated = await updateFleetVehicle(editingVehicle.id, {
        plate: editVehicleForm.plate.toUpperCase().trim(),
        prefix_code: editVehicleForm.prefix_code.toUpperCase().trim() || undefined,
        model: editVehicleForm.model.trim(),
        department: editVehicleForm.department.trim(),
        fuel_type: editVehicleForm.fuel_type,
        tank_capacity: Number(editVehicleForm.tank_capacity),
        metric_type: editVehicleForm.metric_type,
        expected_consumption: Number(editVehicleForm.expected_consumption),
        current_odometer: Number(editVehicleForm.current_odometer),
        status: editVehicleForm.status,
        budget_classification_id: editVehicleForm.budget_classification_id && editVehicleForm.budget_classification_id.trim() !== '' ? editVehicleForm.budget_classification_id : undefined,
        always_full_tank: Boolean(editVehicleForm.always_full_tank),
        is_emergency_priority: Boolean(editVehicleForm.is_emergency_priority)
      });

      setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? updated : v));
      showToast(`Veículo ${editVehicleForm.plate} atualizado com sucesso!`, 'success');
      setIsEditVehicleModalOpen(false);
      setEditingVehicle(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar veículo.', 'error');
    }
  };

  const handleDeleteVehicle = async (vehicle: FleetVehicle) => {
    const confirmMsg = `Deseja realmente remover o veículo ${vehicle.plate} (${vehicle.model}) da frota?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await deleteFleetVehicle(vehicle.id);
      showToast(res.message, res.baixado ? 'warning' : 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover veículo.', 'error');
    }
  };

  // Excluir toda a frota municipal (limpeza total para recadastro)
  const handleClearAllFleet = async () => {
    if (!confirm(`ATENÇÃO: Deseja realmente excluir toda a frota municipal atual (${vehicles.length} veículos)?\nTodos os veículos serão removidos para permitir que você cadastre os novos veículos do zero.`)) {
      return;
    }
    try {
      const res = await clearAllFleetVehicles(currentUser?.institution_id || 'inst_1');
      showToast(res.message, 'success');
      loadData();
    } catch (err) {
      showToast('Erro ao excluir frota municipal.', 'error');
    }
  };

  // Excluir ordem de abastecimento / auditoria
  const handleDeleteOrder = async (order: FuelSupplyOrder) => {
    if (!confirm(`Deseja realmente excluir a ordem ${order.order_number}? A numeração continuará na sequência contínua para novas ordens.`)) {
      return;
    }
    try {
      await deleteFuelSupplyOrder(order.id, order.order_number);
      showToast(`Ordem ${order.order_number} excluída do banco e do sistema! Próxima ordem continuará na sequência.`, 'success');
      loadData();
    } catch (err) {
      showToast('Erro ao excluir ordem.', 'error');
    }
  };

  // Limpar todo o histórico de ordens e reiniciar testes a partir de 0001
  const handleClearAllOrders = async () => {
    const confirmMsg =
      "ATENÇÃO: Deseja apagar todas as ordens de abastecimento e limpar os registros de teste?\n\n" +
      "• Todas as ordens locais e no banco de dados serão excluídas.\n" +
      "• O contador de autorizações será reiniciado para AUT-" + new Date().getFullYear() + "-0001 para que você possa iniciar novos testes do zero.\n\n" +
      "Deseja confirmar a limpeza total de ordens?";

    if (!confirm(confirmMsg)) return;

    try {
      await clearAllFuelOrders();
      showToast(`Histórico de ordens limpo com sucesso! Próxima autorização iniciará em AUT-${new Date().getFullYear()}-0001.`, 'success');
      loadData();
    } catch (err) {
      showToast('Erro ao limpar histórico de ordens.', 'error');
    }
  };

  // Handlers para Motoristas
  const handleOpenNewDriver = () => {
    setDriverForm({
      full_name: '',
      cpf: '',
      birth_date: '',
      department: officialDepartments[0] || '',
      cnh_number: '',
      cnh_category: 'B',
      status: 'ativo'
    });
    setEditingDriver(null);
    setIsNewDriverModalOpen(true);
  };

  const handleOpenEditDriver = (driver: FleetDriver) => {
    setEditingDriver(driver);
    const resolvedDept = matchOfficialDepartmentName(driver.department, officialDepartments) || driver.department || officialDepartments[0] || '';
    setDriverForm({
      full_name: driver.full_name,
      cpf: driver.cpf || '',
      birth_date: driver.birth_date || '',
      department: resolvedDept,
      cnh_number: driver.cnh_number || '',
      cnh_category: driver.cnh_category || 'B',
      status: driver.status
    });
    setIsEditDriverModalOpen(true);
  };

  const handleAddMunicipalDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentNameInput.trim()) return;
    setSavingDepartment(true);
    try {
      const created = await addMunicipalDepartment(newDepartmentNameInput.trim());
      setNewDepartmentNameInput('');
      showToast(`Secretaria "${created.name}" cadastrada para o município!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao cadastrar secretaria.', 'error');
    } finally {
      setSavingDepartment(false);
    }
  };

  const handleDeleteMunicipalDepartment = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir a secretaria "${name}" do município?\n\nEla deixará de aparecer nas opções de cadastro de todo o sistema deste município.`)) {
      return;
    }
    try {
      await removeMunicipalDepartment(id);
      if (departmentFilter === name) {
        setDepartmentFilter('all');
      }
      showToast(`Secretaria "${name}" removida com sucesso!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir secretaria.', 'error');
    }
  };

  const handleStandardizeLegacyRecords = async (mappingOverrides?: Record<string, string>) => {
    if (officialDepartments.length === 0) {
      showToast('Cadastre ao menos uma secretaria oficial primeiro.', 'warning');
      return;
    }
    setStandardizingDepartments(true);
    let updatedCount = 0;
    try {
      for (const d of drivers) {
        if (!d.department || officialDepartments.includes(d.department)) continue;
        const target = mappingOverrides?.[d.department] || matchOfficialDepartmentName(d.department, officialDepartments);
        if (target && target !== d.department) {
          await updateFleetDriver(d.id, { department: target });
          updatedCount++;
        }
      }
      for (const v of vehicles) {
        if (!v.department || officialDepartments.includes(v.department)) continue;
        const target = mappingOverrides?.[v.department] || matchOfficialDepartmentName(v.department, officialDepartments);
        if (target && target !== v.department) {
          await updateFleetVehicle(v.id, { department: target });
          updatedCount++;
        }
      }
      if (updatedCount > 0) {
        await loadData(true);
        showToast(`${updatedCount} registros padronizados com as secretarias oficiais do município!`, 'success');
      } else {
        showToast('Nenhuma lotação pendente de correspondência automática.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao padronizar secretarias.', 'error');
    } finally {
      setStandardizingDepartments(false);
    }
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.full_name.trim()) {
      showToast('Preencha o Nome Completo do motorista.', 'warning');
      return;
    }

    try {
      if (editingDriver) {
        await updateFleetDriver(editingDriver.id, driverForm);
        showToast(`Motorista ${driverForm.full_name} atualizado com sucesso!`, 'success');
        setIsEditDriverModalOpen(false);
      } else {
        await createFleetDriver({
          ...driverForm,
          institution_id: currentUser?.institution_id || 'inst_1'
        });
        showToast(`Motorista ${driverForm.full_name} cadastrado com sucesso!`, 'success');
        setIsNewDriverModalOpen(false);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar motorista.', 'error');
    }
  };

  const handleDeleteDriver = async (driver: FleetDriver) => {
    const cpfLabel = driver.cpf ? ` (CPF: ${driver.cpf})` : '';
    if (!confirm(`Deseja realmente remover o condutor ${driver.full_name}${cpfLabel}?\n\nEle será excluído definitivamente do banco de dados e do sistema.`)) {
      return;
    }
    try {
      setDrivers(prev => prev.filter(d => d.id !== driver.id));
      await deleteFleetDriver(driver.id, driver.cpf);
      showToast(`Motorista ${driver.full_name} removido definitivamente com sucesso!`, 'success');
      loadData(true);
    } catch (err) {
      showToast('Erro ao remover motorista.', 'error');
    }
  };

  const handleClearAllDrivers = async () => {
    const confirmMsg =
      "ATENÇÃO: Deseja realmente excluir TODOS os motoristas cadastrados?\n\n" +
      "• Todos os motoristas no banco de dados e no sistema serão excluídos definitivamente.\n" +
      "• O cadastro ficará completamente zerado para você cadastrar apenas os motoristas desejados.\n\n" +
      "Deseja confirmar a exclusão total de motoristas?";

    if (!confirm(confirmMsg)) return;

    try {
      setDrivers([]);
      const res = await clearAllFleetDrivers(currentUser?.institution_id || 'inst_1');
      showToast(res.message, 'success');
      loadData(true);
    } catch (err) {
      showToast('Erro ao limpar motoristas.', 'error');
    }
  };

  // Handlers para Postos Credenciados
  const handleOpenNewStation = () => {
    setStationForm({
      name: '',
      cnpj: '',
      address: '',
      city: 'Torixoréu - MT',
      phone: '',
      status: 'ativo'
    });
    setEditingStation(null);
    setIsNewStationModalOpen(true);
  };

  const handleOpenEditStation = (station: FleetFuelStation) => {
    setEditingStation(station);
    setStationForm({
      name: station.name,
      cnpj: station.cnpj || '',
      address: station.address || '',
      city: station.city || 'Torixoréu - MT',
      phone: station.phone || '',
      status: station.status
    });
    setIsEditStationModalOpen(true);
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.name.trim()) {
      showToast('Preencha o Nome / Razão Social do posto credenciado.', 'warning');
      return;
    }

    try {
      if (editingStation) {
        await updateFleetFuelStation(editingStation.id, stationForm);
        showToast(`Posto ${stationForm.name} atualizado com sucesso!`, 'success');
        setIsEditStationModalOpen(false);
      } else {
        await createFleetFuelStation({
          ...stationForm,
          institution_id: currentUser?.institution_id || 'inst_1'
        });
        showToast(`Posto ${stationForm.name} cadastrado com sucesso!`, 'success');
        setIsNewStationModalOpen(false);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar posto credenciado.', 'error');
    }
  };

  const handleDeleteStation = async (station: FleetFuelStation) => {
    if (!confirm(`Deseja realmente remover o posto conveniado ${station.name}?\n\nEle será excluído definitivamente do banco de dados e do sistema.`)) {
      return;
    }
    try {
      setStations(prev => prev.filter(s => s.id !== station.id && s.name !== station.name));
      await deleteFleetFuelStation(station.id, station.name, station.cnpj);
      showToast(`Posto ${station.name} removido com sucesso!`, 'success');
      loadData(true);
    } catch (err) {
      showToast('Erro ao remover posto credenciado.', 'error');
    }
  };

  const handleClearAllStations = async () => {
    const confirmMsg =
      "ATENÇÃO: Deseja realmente excluir TODOS os postos credenciados cadastrados?\n\n" +
      "• Todos os postos no banco de dados e no sistema serão excluídos definitivamente.\n" +
      "• O cadastro ficará completamente zerado para você cadastrar apenas os postos desejados.\n\n" +
      "Deseja confirmar a exclusão total de postos?";

    if (!confirm(confirmMsg)) return;

    try {
      setStations([]);
      const res = await clearAllFleetFuelStations(currentUser?.institution_id || 'inst_1');
      showToast(res.message, 'success');
      loadData(true);
    } catch (err) {
      showToast('Erro ao limpar postos.', 'error');
    }
  };

  useEffect(() => {
    loadData();
    // Garante que todas as ordens locais emitidas estejam sincronizadas com o Supabase para o QR Code no celular
    syncLocalOrdersToSupabase();

    // 1. Escuta eventos locais na mesma aba / navegador
    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const orderNumber = customEvent.detail?.orderNumber || customEvent.detail?.order?.order_number;
      if (customEvent.detail?.order) {
        addRealtimeNotification(customEvent.detail.order);
      } else if (orderNumber) {
        addRealtimeNotification({ order_number: orderNumber, status: 'abastecido' });
      }
      loadData(true);
    };

    window.addEventListener('gestao360_fuel_order_updated', handleLocalUpdate);

    // 2. BroadcastChannel para comunicação instantânea entre abas e janelas
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('gestao360_fleet_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'ORDER_COMPLETED') {
          const ord = event.data?.order;
          if (ord) addRealtimeNotification(ord);
          loadData(true);
        }
      };
    }

    // 3. Supabase Realtime para notificações remotas do posto (bomba + odômetro)
    const channel = supabase
      .channel('fuel_supply_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fuel_supply_orders' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as any;
            if (updated && (updated.status === 'abastecido' || updated.pump_photo_url || updated.odometer_photo_url)) {
              addRealtimeNotification(updated);
            }
            loadData(true);
          }
        }
      )
      .subscribe();

    // 4. Polling seguro em segundo plano a cada 4 segundos
    const interval = setInterval(() => {
      loadData(true);
    }, 4000);

    return () => {
      window.removeEventListener('gestao360_fuel_order_updated', handleLocalUpdate);
      if (bc) bc.close();
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Veículo selecionado na emissão de ordem
  const selectedVehicleForNewOrder = useMemo(() => {
    return vehicles.find(v => v.id === newOrderForm.vehicle_id);
  }, [vehicles, newOrderForm.vehicle_id]);

  // Checagem em tempo real de excesso de tanque na emissão
  const isLitersOverCapacity = useMemo(() => {
    if (!selectedVehicleForNewOrder) return false;
    return newOrderForm.liters_authorized > selectedVehicleForNewOrder.tank_capacity;
  }, [selectedVehicleForNewOrder, newOrderForm.liters_authorized]);

  // Checagem em tempo real de coerência do odômetro na emissão (Odômetro regressivo)
  const isOdometerInvalid = useMemo(() => {
    if (!selectedVehicleForNewOrder) return false;
    const prevOdo = Number(selectedVehicleForNewOrder.current_odometer || 0);
    const currOdo = Number(newOrderForm.current_odometer || 0);
    return currOdo > 0 && currOdo < prevOdo;
  }, [selectedVehicleForNewOrder, newOrderForm.current_odometer]);

  // Semáforo Integrado de Auditoria Prévia da Emissão (Padrão TCE)
  const emissionSemaphore = useMemo(() => {
    if (isLitersOverCapacity) {
      return {
        level: 'critico' as const,
        label: 'Bloqueio Crítico TCE',
        reason: `Litragem (${newOrderForm.liters_authorized}L) excede a capacidade máxima do tanque (${selectedVehicleForNewOrder?.tank_capacity}L - ${selectedVehicleForNewOrder?.model}).`,
        badgeColor: 'bg-rose-600 text-white animate-pulse',
        canEmit: false
      };
    }
    if (isOdometerInvalid) {
      return {
        level: 'critico' as const,
        label: 'Odômetro Regressivo (Bloqueio)',
        reason: `Odômetro informado (${formatThousands(newOrderForm.current_odometer)} km) é inferior ao último odômetro cadastrado (${formatThousands(selectedVehicleForNewOrder?.current_odometer || 0)} km).`,
        badgeColor: 'bg-rose-600 text-white animate-pulse',
        canEmit: false
      };
    }
    const hasBudget = Boolean(newOrderForm.budget_classification_id || selectedVehicleForNewOrder?.budget_classification_id);
    if (!hasBudget) {
      return {
        level: 'alerta' as const,
        label: 'Alerta de Dotação',
        reason: 'Nenhuma dotação orçamentária vinculada. Recomenda-se selecionar a Ficha Orçamentária.',
        badgeColor: 'bg-amber-500 text-white',
        canEmit: true
      };
    }
    return {
      level: 'conforme' as const,
      label: '100% Conforme',
      reason: 'Parâmetros validados: capacidade física, odômetro e dotação conformes com o TCE.',
      badgeColor: 'bg-emerald-600 text-white',
      canEmit: true
    };
  }, [isLitersOverCapacity, isOdometerInvalid, newOrderForm.liters_authorized, newOrderForm.current_odometer, newOrderForm.budget_classification_id, selectedVehicleForNewOrder]);

  // Lista oficial e padronizada de Secretarias do Município (e detecção de nomes legados fora do padrão)
  const departments = useMemo(() => {
    if (officialDepartments.length > 0) {
      return officialDepartments;
    }
    const fromVehicles = vehicles.map(v => v.department).filter(Boolean);
    const fromDrivers = drivers.map(d => d.department).filter(Boolean);
    return Array.from(new Set([...fromVehicles, ...fromDrivers])).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [officialDepartments, vehicles, drivers]);

  const legacyUnstandardizedDepartments = useMemo(() => {
    if (officialDepartments.length === 0) return [];
    const counts = new Map<string, { raw: string; drivers: number; vehicles: number; suggested: string | null }>();
    for (const d of drivers) {
      const dept = (d.department || '').trim();
      if (!dept || officialDepartments.includes(dept)) continue;
      const cur = counts.get(dept) || {
        raw: dept,
        drivers: 0,
        vehicles: 0,
        suggested: matchOfficialDepartmentName(dept, officialDepartments)
      };
      cur.drivers++;
      counts.set(dept, cur);
    }
    for (const v of vehicles) {
      const dept = (v.department || '').trim();
      if (!dept || officialDepartments.includes(dept)) continue;
      const cur = counts.get(dept) || {
        raw: dept,
        drivers: 0,
        vehicles: 0,
        suggested: matchOfficialDepartmentName(dept, officialDepartments)
      };
      cur.vehicles++;
      counts.set(dept, cur);
    }
    return Array.from(counts.values()).sort((a, b) => a.raw.localeCompare(b.raw, 'pt-BR'));
  }, [officialDepartments, drivers, vehicles]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const q = (driverSearchTerm || searchTerm).toLowerCase().trim();
      const cleanQ = q.replace(/[^a-z0-9]/g, '');
      const cleanCpf = (d.cpf || '').replace(/[^0-9]/g, '');

      const matchesSearch = !q || 
        d.full_name.toLowerCase().includes(q) || 
        (d.cpf && d.cpf.includes(q)) ||
        (cleanQ.length > 0 && cleanCpf.includes(cleanQ)) ||
        (d.cnh_number && d.cnh_number.toLowerCase().includes(q)) ||
        (d.department && d.department.toLowerCase().includes(q));

      const matchedOfficial = matchOfficialDepartmentName(d.department, officialDepartments);
      const matchesDept = departmentFilter === 'all' || 
        (d.department || '').trim().toLowerCase() === departmentFilter.trim().toLowerCase() ||
        matchedOfficial === departmentFilter ||
        (d.department || '').toLowerCase().includes(departmentFilter.toLowerCase()) ||
        departmentFilter.toLowerCase().includes((d.department || '').toLowerCase());

      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [drivers, driverSearchTerm, searchTerm, departmentFilter, statusFilter]);

  const filteredStations = useMemo(() => {
    return stations.filter(s => {
      const q = stationSearchTerm.toLowerCase().trim();
      return !q || 
        s.name.toLowerCase().includes(q) || 
        (s.cnpj && s.cnpj.includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q));
    });
  }, [stations, stationSearchTerm]);

  // Métricas do Painel de Auditoria (KPIs) e Contadores de Fluxo
  const auditMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const waitingOrders = orders.filter(o => o.status === 'autorizado' || o.status === 'autorizado_pendente');
    const pendingHomologationOrders = orders.filter(o => o.status === 'abastecido');
    const conformePendingOrders = pendingHomologationOrders.filter(
      o => !o.is_anomaly && o.anomaly_level !== 'bloqueio_critico' && o.anomaly_level !== 'alerta_amarelo'
    );
    const yellowAlertOrders = orders.filter(o => o.anomaly_level === 'alerta_amarelo');
    const suppliedOrders = orders.filter(o => o.status !== 'autorizado' && o.status !== 'autorizado_pendente');
    const totalLiters = suppliedOrders.reduce((acc, o) => {
      const lit = Number(o.liters_supplied || o.liters_authorized || 0);
      return acc + (isNaN(lit) ? 0 : lit);
    }, 0);
    const totalSpent = suppliedOrders.reduce((acc, o) => {
      const val = Number(o.total_value) || Number((o as any).total_authorized_value) || 0;
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    const anomalousOrders = orders.filter(o => o.is_anomaly || o.status === 'glosado' || o.anomaly_level === 'bloqueio_critico');
    const auditedOrders = orders.filter(o => o.status === 'auditado' || o.status === 'liquidado');

    // Consumo médio ponderado (ignora 1º registro de odômetro base e anomalias irreais)
    const validConsumptionOrders = suppliedOrders.filter(o => {
      const c = Number(o.calculated_consumption ?? o.calculated_km_per_liter ?? 0);
      const prevOdo = Number(o.previous_odometer || 0);
      return prevOdo > 0 && !isNaN(c) && c > 0 && c <= 50;
    });
    const avgConsumption = validConsumptionOrders.length > 0
      ? (validConsumptionOrders.reduce((acc, o) => acc + Number(o.calculated_consumption ?? o.calculated_km_per_liter ?? 0), 0) / validConsumptionOrders.length).toFixed(2)
      : '0.00';

    return {
      totalOrders,
      waitingCount: waitingOrders.length,
      pendingHomologationCount: pendingHomologationOrders.length,
      conformePendingCount: conformePendingOrders.length,
      yellowAlertCount: yellowAlertOrders.length,
      totalLiters: totalLiters.toFixed(2),
      totalSpent: totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      anomalousCount: anomalousOrders.length,
      auditedCount: auditedOrders.length,
      avgConsumption
    };
  }, [orders]);

  // Filtragem ampla e resiliente de ordens (busca em todos os campos)
  const filteredOrders = useMemo(() => {
    const raw = searchTerm.trim().toLowerCase();
    const searchTerms = raw.split(/\s+/).filter(Boolean);

    const result = orders.filter(order => {
      if (!order) return false;
      const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);

      // Filtro de Secretaria (inclui correspondência de abreviações legadas para secretaria oficial)
      const vDept = (v?.department || '').trim();
      const matchedOrderDept = matchOfficialDepartmentName(vDept, officialDepartments);
      const matchesDept = departmentFilter === 'all' ||
        vDept.toLowerCase() === departmentFilter.trim().toLowerCase() ||
        matchedOrderDept === departmentFilter;
      if (!matchesDept) return false;

      // Filtro de Status e Semáforo
      let matchesStatus = true;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'anomalia_critica') {
        matchesStatus = order.anomaly_level === 'bloqueio_critico' || order.is_anomaly || order.status === 'glosado';
      } else if (statusFilter === 'alerta_amarelo') {
        matchesStatus = order.anomaly_level === 'alerta_amarelo';
      } else if (statusFilter === 'conforme') {
        matchesStatus = order.status === 'auditado' || (order.status === 'abastecido' && !order.is_anomaly && order.anomaly_level !== 'bloqueio_critico' && order.anomaly_level !== 'alerta_amarelo');
      } else {
        matchesStatus = order.status === statusFilter;
      }
      if (!matchesStatus) return false;

      // Se não digitou busca, passa direto
      if (searchTerms.length === 0) return true;

      // Campos textuais para busca resiliente
      const orderNum = (order.order_number || '').toLowerCase();
      const cleanOrderNum = orderNum.replace(/[^a-z0-9]/g, '');

      const driver = (order.driver_name || '').toLowerCase();
      const driverDoc = (order.driver_document || '').replace(/\D/g, '');

      const plate = (v?.plate || '').toLowerCase();
      const cleanPlate = plate.replace(/[^a-z0-9]/g, '');

      const model = (v?.model || '').toLowerCase();
      const prefix = (v?.prefix_code || '').toLowerCase();
      const station = (order.station_name || '').toLowerCase();
      const voucher = String((order as any).voucher_number || (order as any).custom_order_number || '').toLowerCase();
      const cleanVoucher = voucher.replace(/[^a-z0-9]/g, '');
      const invoice = (order.invoice_number || '').toLowerCase();
      const fuel = (order.fuel_type || '').toLowerCase().replace(/_/g, ' ');
      const notes = String((order as any).notes || '').toLowerCase();
      const dept = (v?.department || '').toLowerCase();
      const authBy = (order.authorized_by_name || '').toLowerCase();

      // Cada termo digitado deve encontrar correspondência
      return searchTerms.every(term => {
        const cleanTerm = term.replace(/[^a-z0-9]/g, '');
        return (
          orderNum.includes(term) ||
          (cleanTerm && cleanOrderNum.includes(cleanTerm)) ||
          driver.includes(term) ||
          (cleanTerm && driverDoc.includes(cleanTerm)) ||
          plate.includes(term) ||
          (cleanTerm && cleanPlate.includes(cleanTerm)) ||
          model.includes(term) ||
          prefix.includes(term) ||
          station.includes(term) ||
          voucher.includes(term) ||
          (cleanTerm && cleanVoucher.includes(cleanTerm)) ||
          invoice.includes(term) ||
          fuel.includes(term) ||
          notes.includes(term) ||
          dept.includes(term) ||
          authBy.includes(term)
        );
      });
    });

    if (orderNumberSort === 'asc') {
      return [...result].sort((a, b) => 
        (a.order_number || '').localeCompare(b.order_number || '', undefined, { numeric: true, sensitivity: 'base' })
      );
    } else if (orderNumberSort === 'desc') {
      return [...result].sort((a, b) => 
        (b.order_number || '').localeCompare(a.order_number || '', undefined, { numeric: true, sensitivity: 'base' })
      );
    }

    return result;
  }, [orders, vehicles, searchTerm, departmentFilter, statusFilter, orderNumberSort]);

  // Filtragem ampla de veículos para a aba de Veículos (utiliza a barra de pesquisa principal)
  const filteredVehiclesList = useMemo(() => {
    const raw = searchTerm.trim().toLowerCase();
    const searchTerms = raw.split(/\s+/).filter(Boolean);

    return vehicles.filter(v => {
      if (!v) return false;

      // Filtro de Secretaria (inclui correspondência de abreviações legadas para secretaria oficial)
      const vDept = (v.department || '').trim();
      const matchedVehicleDept = matchOfficialDepartmentName(vDept, officialDepartments);
      const matchesDept = departmentFilter === 'all' ||
        vDept.toLowerCase() === departmentFilter.trim().toLowerCase() ||
        matchedVehicleDept === departmentFilter;
      if (!matchesDept) return false;

      // Filtro de Status
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      if (!matchesStatus) return false;

      if (searchTerms.length === 0) return true;

      const plate = (v.plate || '').toLowerCase();
      const cleanPlate = plate.replace(/[^a-z0-9]/g, '');
      const model = (v.model || '').toLowerCase();
      const prefix = (v.prefix_code || '').toLowerCase();
      const dept = (v.department || '').toLowerCase();
      const fuel = (v.fuel_type || '').toLowerCase().replace(/_/g, ' ');
      const chassis = (v.chassis_number || '').toLowerCase();
      const renavam = (v.renavam || '').toLowerCase();

      return searchTerms.every(term => {
        const cleanT = term.replace(/[^a-z0-9]/g, '');
        return (
          plate.includes(term) ||
          (cleanT && cleanPlate.includes(cleanT)) ||
          model.includes(term) ||
          prefix.includes(term) ||
          dept.includes(term) ||
          fuel.includes(term) ||
          chassis.includes(term) ||
          renavam.includes(term)
        );
      });
    });
  }, [vehicles, searchTerm, departmentFilter, statusFilter]);

  // Reseta para página 1 ao alterar filtros de busca ou aba
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, driverSearchTerm, departmentFilter, statusFilter, activeTab, orderNumberSort]);

  // Paginação para Ordens (Aba 1 e Aba 3 - 30 itens por página)
  const totalPagesOrders = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Paginação para Veículos (Aba 4 - 30 itens por página)
  const totalPagesVehicles = Math.ceil(filteredVehiclesList.length / ITEMS_PER_PAGE) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVehiclesList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVehiclesList, currentPage]);

  // Paginação para Execução / Lançamento de Canhotos (Aba 2 - 30 itens por página)
  const pendingExecutionOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === 'autorizado' || o.status === 'autorizado_pendente');
  }, [filteredOrders]);
  const totalPagesExecution = Math.ceil(pendingExecutionOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedExecutionOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return pendingExecutionOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [pendingExecutionOrders, currentPage]);

  // Paginação para Motoristas (Aba 5 - 30 itens por página)
  const totalPagesDrivers = Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE) || 1;
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDrivers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDrivers, currentPage]);

  // Paginação para Postos (Aba 6 - 30 itens por página)
  const totalPagesStations = Math.ceil(filteredStations.length / ITEMS_PER_PAGE) || 1;
  const paginatedStations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStations, currentPage]);

  // Componente de navegação e paginação de 30 itens
  const renderPagination = (
    current: number,
    total: number,
    totalItems: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalItems <= ITEMS_PER_PAGE) return null;

    const startItem = (current - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(current * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-neutral-500 dark:text-neutral-400 font-medium">
          Mostrando <strong className="text-neutral-800 dark:text-white font-bold">{startItem}</strong> a{' '}
          <strong className="text-neutral-800 dark:text-white font-bold">{endItem}</strong> de{' '}
          <strong className="text-neutral-800 dark:text-white font-bold">{totalItems}</strong> registros
          {' '}(30 por página)
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={current === 1}
            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Primeira página"
          >
            «
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, current - 1))}
            disabled={current === 1}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            Anterior
          </button>

          <span className="px-3 py-1.5 font-bold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm">
            Página {current} de {total}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(Math.min(total, current + 1))}
            disabled={current === total}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            Próxima
          </button>
          <button
            type="button"
            onClick={() => onPageChange(total)}
            disabled={current === total}
            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Última página"
          >
            »
          </button>
        </div>
      </div>
    );
  };

  // Cancelar Homologação ou Glosa para permitir correções de dados
  const handleCancelHomologation = async (order: FuelSupplyOrder) => {
    const isGlosado = order.status === 'glosado';
    const actionLabel = isGlosado ? 'glosa' : 'homologação';
    const confirmMsg = `Deseja realmente cancelar a ${actionLabel} da Ordem nº ${order.order_number}?\n\nA ordem retornará ao status "Abastecido no Posto", liberando a edição de odômetro, litragem, fotos e dotação orçamentária.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await cancelFuelOrderHomologation(order.id, 'Cancelamento para correção de dados', currentUser?.id);
      showToast(`A ${actionLabel} da ordem ${order.order_number} foi cancelada com sucesso! A ordem já pode ser editada.`, 'success');
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao cancelar homologação.', 'error');
    }
  };

  // Homologação rápida em lote de todas as ordens abastecidas que estão 100% conformes no Semáforo TCE
  const handleBatchHomologateConformes = async () => {
    const conformesToAudit = filteredOrders.filter(
      o => o.status === 'abastecido' && !o.is_anomaly && o.anomaly_level !== 'bloqueio_critico' && o.anomaly_level !== 'alerta_amarelo'
    );
    if (conformesToAudit.length === 0) {
      showToast('Não há ordens pendentes e 100% conformes para homologar em lote.', 'info');
      return;
    }
    if (!window.confirm(`Deseja homologar em lote ${conformesToAudit.length} ${conformesToAudit.length === 1 ? 'ordem abastecida que está' : 'ordens abastecidas que estão'} 100% Conforme no Semáforo TCE?`)) {
      return;
    }
    try {
      for (const ord of conformesToAudit) {
        await auditFuelOrder(
          ord.id,
          'auditado',
          'Homologação em lote pelo Controle Interno — Semáforo TCE 100% Conforme.',
          currentUser?.id
        );
      }
      showToast(`${conformesToAudit.length} ${conformesToAudit.length === 1 ? 'ordem homologada' : 'ordens homologadas'} com sucesso!`, 'success');
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao homologar ordens em lote.', 'error');
    }
  };

  // Abre a Janela Central da Ordem (Inspeção, Homologação em 1 Clique e Ações)
  const handleOpenOrderHub = (order: FuelSupplyOrder) => {
    setSelectedOrderForAction(order);
    setShowGlossReasonBox(false);
    setAuditForm({
      status: order.status === 'glosado' ? 'glosado' : 'auditado',
      justification:
        order.anomaly_reason ||
        'Documentação física, odômetro e comprovantes conferidos e homologados em conformidade com as diretrizes do Tribunal de Contas.'
    });
    setIsAuditModalOpen(true);
  };

  // Homologação Instantânea em 1 Clique dentro da Janela da Ordem
  const handleInstantHomologate = async (order: FuelSupplyOrder, customJustification?: string) => {
    try {
      const justificationText =
        customJustification?.trim() ||
        'Documentação física, odômetro e comprovantes conferidos e homologados em conformidade com as diretrizes do Tribunal de Contas.';
      await auditFuelOrder(order.id, 'auditado', justificationText, currentUser?.id);
      showToast(`Ordem ${order.order_number} homologada com sucesso!`, 'success');
      setIsAuditModalOpen(false);
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao homologar ordem.', 'error');
    }
  };

  // Cancelamento de Homologação direto na Janela da Ordem (sem exigir prompt extra)
  const handleInstantCancelHomologation = async (order: FuelSupplyOrder, openEditAfter = false) => {
    try {
      await cancelFuelOrderHomologation(
        order.id,
        'Homologação/Glosa cancelada pelo gestor na janela da ordem para revisão.',
        currentUser?.id
      );
      showToast(`Homologação cancelada! Ordem ${order.order_number} reaberta.`, 'info');
      setIsAuditModalOpen(false);
      await loadData(true);
      if (openEditAfter) {
        const reopenedOrder = { ...order, status: 'abastecido' as const };
        handleOpenExecution(reopenedOrder);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao cancelar homologação.', 'error');
    }
  };

  // Abertura do modal de execução com pré-preenchimento
  const handleOpenExecution = async (order: FuelSupplyOrder) => {
    if (order.status === 'auditado' || order.status === 'glosado') {
      const isGlosado = order.status === 'glosado';
      const actionName = isGlosado ? 'glosada' : 'homologada';
      const proceed = window.confirm(
        `A Ordem nº ${order.order_number} está ${actionName}.\n\nDeseja cancelar a ${actionName} para reabrir esta ordem e editar os dados (odômetro, litragem ou fotos)?`
      );
      if (!proceed) return;

      try {
        await cancelFuelOrderHomologation(order.id, 'Cancelado para permitir nova edição de dados', currentUser?.id);
        showToast(`Homologação cancelada. Ordem ${order.order_number} reaberta para edição!`, 'info');
        loadData(true);
      } catch (err: any) {
        showToast(err.message || 'Erro ao cancelar homologação.', 'error');
        return;
      }
    }

    const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
    setSelectedOrderForAction(order);
    setExecutionForm({
      custom_order_number: order.order_number || '',
      liters_supplied: order.liters_supplied || order.liters_authorized,
      current_odometer: order.current_odometer && order.current_odometer > order.previous_odometer 
        ? order.current_odometer 
        : order.previous_odometer + 150,
      unit_price: order.unit_price || 6.19,
      invoice_number: order.invoice_number || '',
      invoice_key: order.invoice_key || '',
      receipt_attachment_url: order.receipt_attachment_url || (order as any).receipt_photo_url || '',
      odometer_photo_url: order.odometer_photo_url || '',
      pump_photo_url: order.pump_photo_url || '',
      invoice_attachment_url: order.invoice_attachment_url || '',
      budget_classification_id: order.budget_classification_id || (order.budget_classification as any)?.id || v?.budget_classification_id || ''
    });
    setIsExecutionModalOpen(true);
  };

  // Preço unitário contratual licitado e valor total travado
  const currentBiddedPrice = useMemo(() => {
    if (!selectedVehicleForNewOrder) return 6.19;
    return biddedPrices[selectedVehicleForNewOrder.fuel_type]?.price || CONTRACTUAL_BIDDED_PRICES[selectedVehicleForNewOrder.fuel_type]?.price || 6.19;
  }, [selectedVehicleForNewOrder, biddedPrices]);

  const currentTotalAuthorized = useMemo(() => {
    return Number((newOrderForm.liters_authorized * currentBiddedPrice).toFixed(2));
  }, [newOrderForm.liters_authorized, currentBiddedPrice]);

  // Salvar tabela de preços licitados / reequilíbrio
  const handleSaveBiddedPrices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await saveBiddedFuelPrices(
        priceEditForm,
        currentUser?.institution_id,
        rebalanceReasonInput,
        rebalanceTermInput
      );
      setBiddedPrices(saved);
      setIsPriceConfigModalOpen(false);
      showToast('Tabela de Preços Licitados e Reequilíbrio atualizados com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar tabela de preços.', 'error');
    }
  };

  // Vincular Nota Fiscal faturada pelo posto à requisição
  const handleSaveLinkedInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceLinkOrder || !invoiceLinkNumber.trim()) return;

    try {
      await linkInvoiceToFuelOrder(invoiceLinkOrder.id, invoiceLinkNumber);
      showToast(`Nota Fiscal ${invoiceLinkNumber} vinculada com sucesso à requisição!`, 'success');
      setIsLinkInvoiceModalOpen(false);
      setInvoiceLinkOrder(null);
      setInvoiceLinkNumber('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao vincular Nota Fiscal.', 'error');
    }
  };

  // Identificação automática de motorista no passo 2 por Nome ou CPF
  const matchedDriverFromForm = useMemo(() => {
    const cleanDoc = newOrderForm.driver_document.replace(/\D/g, '');
    if (cleanDoc.length === 11 && !/^0+$/.test(cleanDoc)) {
      return drivers.find(d => (d.cpf || '').replace(/\D/g, '') === cleanDoc) || null;
    }
    if (newOrderForm.driver_name.trim().length >= 3) {
      return drivers.find(d => d.full_name.toLowerCase().trim() === newOrderForm.driver_name.toLowerCase().trim()) || null;
    }
    return null;
  }, [drivers, newOrderForm.driver_document, newOrderForm.driver_name]);

  const filteredDriversForStep2 = useMemo(() => {
    const term = (driverSearchQuery || newOrderForm.driver_name).toLowerCase().trim();
    if (!term || term.length < 2) return [];
    const cleanDigits = term.replace(/\D/g, '');
    return drivers.filter(d => {
      const matchName = d.full_name.toLowerCase().includes(term);
      const matchCpf = cleanDigits ? (d.cpf || '').replace(/\D/g, '').includes(cleanDigits) : false;
      const matchDept = (d.department || '').toLowerCase().includes(term);
      return matchName || matchCpf || matchDept;
    }).slice(0, 6);
  }, [drivers, driverSearchQuery, newOrderForm.driver_name]);

  const handleDriverCpfChange = (raw: string) => {
    const formatted = formatCPF(raw);
    const clean = raw.replace(/\D/g, '');
    const found = (clean.length === 11 && !/^0+$/.test(clean))
      ? drivers.find(d => (d.cpf || '').replace(/\D/g, '') === clean)
      : undefined;
    setNewOrderForm(prev => ({
      ...prev,
      driver_document: formatted,
      driver_name: found ? found.full_name : prev.driver_name
    }));
    if (found && !newOrderForm.driver_name) {
      showToast(`Motorista identificado: ${found.full_name} (${found.department})`, 'info');
    }
  };

  const handleDriverNameChange = (val: string) => {
    setShowDriverSuggestions(true);
    const found = drivers.find(d => d.full_name.toLowerCase().trim() === val.toLowerCase().trim());
    setNewOrderForm(prev => ({
      ...prev,
      driver_name: val,
      driver_document: found ? (found.cpf ? formatCPF(found.cpf) : '') : prev.driver_document
    }));
  };

  const handleSelectDriverQuick = (driver: FleetDriver) => {
    setNewOrderForm(prev => ({
      ...prev,
      driver_name: driver.full_name,
      driver_document: driver.cpf ? formatCPF(driver.cpf) : ''
    }));
    setShowDriverSuggestions(false);
    setDriverSearchQuery('');
    showToast(`Condutor selecionado: ${driver.full_name}`, 'info');
  };

  // Abertura do modal de nova ordem com numeração padrão de 7 dígitos pré-calculada
  const handleOpenNewOrder = async () => {
    try {
      const nextNum = await getNextOrderNumber7Digits();
      setNewOrderForm(prev => ({
        ...prev,
        custom_order_number: nextNum
      }));
    } catch (err) {
      console.warn('Erro ao obter próximo número sequencial de 7 dígitos:', err);
    }
    setNewOrderStep(1);
    setIsNewOrderModalOpen(true);
  };

  // Envio de nova ordem com emissão em duas vias e parâmetros travados
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.vehicle_id) {
      showToast('Selecione um veículo da frota.', 'warning');
      return;
    }
    if (isLitersOverCapacity) {
      showToast('A litragem excede a capacidade do tanque do veículo. Operação bloqueada pelo Semáforo do TCE.', 'error');
      return;
    }
    if (isOdometerInvalid) {
      showToast('O odômetro informado não pode ser menor que o odômetro anterior do veículo. Operação bloqueada pelo Semáforo do TCE.', 'error');
      return;
    }

    try {
      const created = await issueFuelAuthorization({
        vehicle_id: newOrderForm.vehicle_id,
        driver_name: newOrderForm.driver_name,
        driver_document: newOrderForm.driver_document,
        station_name: newOrderForm.station_name,
        bidded_unit_price: currentBiddedPrice,
        liters_authorized: Number(newOrderForm.liters_authorized),
        current_odometer: Number(newOrderForm.current_odometer),
        supply_mode: newOrderForm.supply_mode,
        authorized_by_name: newOrderForm.authorized_by_name,
        authorized_by_role: newOrderForm.authorized_by_role,
        budget_classification_id: newOrderForm.budget_classification_id || selectedVehicleForNewOrder?.budget_classification_id,
        budget_classification: budgetClassifications.find(b => b.id === newOrderForm.budget_classification_id) || selectedVehicleForNewOrder?.budget_classification,
        custom_order_number: newOrderForm.custom_order_number?.trim() 
          ? formatOrderNumber7Digits(newOrderForm.custom_order_number.trim()) 
          : undefined
      });

      showToast(`Autorização ${created.order_number} emitida com sucesso! Via do Sistema registrada.`, 'success');
      setIsNewOrderModalOpen(false);
      setNewOrderStep(1);
      
      const nextNum = await getNextOrderNumber7Digits();
      setNewOrderForm({
        custom_order_number: nextNum,
        vehicle_id: '',
        driver_name: '',
        driver_document: '',
        station_name: 'Auto Posto Central Municipal Ltda',
        fuel_type: 'diesel_s10',
        liters_authorized: 50,
        current_odometer: 0,
        is_full_tank_order: false,
        emergency_call_reason: '',
        budget_classification_id: ''
      });
      loadData();

      // Dispara imediatamente a impressão da folha A4 com as 2 vias e QR Code
      imprimirCanhotoDuasVias(created, created.vehicle || selectedVehicleForNewOrder);
    } catch (err: any) {
      showToast(err.message || 'Erro ao emitir autorização.', 'error');
    }
  };

  // Envio de execução / baixa de canhoto no próprio sistema
  const handleSaveExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForAction) return;

    const currentKm = Number(executionForm.current_odometer);
    if (isNaN(currentKm) || currentKm <= 0) {
      showToast('Por favor, informe a leitura atual do odômetro no painel do veículo.', 'warning');
      return;
    }

    try {
      const res = await validateAndCompleteFuelOrder(selectedOrderForAction.id, {
        current_odometer: currentKm,
        liters_supplied: Number(executionForm.liters_supplied) || selectedOrderForAction.liters_authorized,
        receipt_photo_url: executionForm.receipt_attachment_url || undefined,
        odometer_photo_url: executionForm.odometer_photo_url || undefined,
        pump_photo_url: executionForm.pump_photo_url || undefined,
        invoice_coupon_number: executionForm.invoice_number?.trim() || undefined,
        audit_justification: executionForm.invoice_key?.trim() || undefined,
        custom_order_number: executionForm.custom_order_number?.trim() 
          ? formatOrderNumber7Digits(executionForm.custom_order_number.trim()) 
          : undefined,
        budget_classification_id: executionForm.budget_classification_id || undefined,
        allowAuditedEdit: true
      });

      if (res.audit.anomaly_level === 'bloqueio_critico') {
        showToast(`Abastecimento registrado com BLOQUEIO CRÍTICO DE AUDITORIA: ${res.audit.anomaly_reason}`, 'error');
      } else if (res.audit.anomaly_level === 'alerta_amarelo') {
        showToast(`Abastecimento registrado com ALERTA MODERADO (${res.audit.deviation_percent}% desvio).`, 'warning');
      } else {
        showToast(`Abastecimento registrado com sucesso! Consumo apurado: ${res.audit.calculated_km_per_liter} km/l`, 'success');
      }

      setIsExecutionModalOpen(false);
      setSelectedOrderForAction(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar baixa do odômetro.', 'error');
    }
  };

  // Alterar / corrigir Ficha Orçamentária no modal de detalhes/fotos
  const handleSaveViewerBudget = async () => {
    if (!viewingAttachmentOrder || !viewerBudgetId) return;
    setSavingViewerBudget(true);
    try {
      const updated = await updateFuelOrderBudgetClassification(
        viewingAttachmentOrder.id,
        viewerBudgetId,
        currentUser?.institution_id || 'inst_1'
      );
      setViewingAttachmentOrder(updated as any);
      setOrders(prev => prev.map(o => (o.id === updated.id || o.order_number === updated.order_number || o.id === viewingAttachmentOrder.id ? (updated as any) : o)));
      setIsEditingViewerBudget(false);
      const sheetName = updated.budget_classification?.invoice_sheet || viewerBudgetId;
      showToast(`Classificação orçamentária atualizada com sucesso para Ficha ${sheetName}!`, 'success');
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar dotação.', 'error');
    } finally {
      setSavingViewerBudget(false);
    }
  };

  // Modal rápido de edição de Ficha Orçamentária
  const handleOpenBudgetModal = (order: FuelSupplyOrder) => {
    const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
    setOrderForBudgetEdit(order);
    const activeBc = resolveOrderBudget(order, v, budgetClassifications);
    setBudgetEditId(activeBc?.id || order.budget_classification_id || v?.budget_classification_id || '');
  };

  const handleSaveOrderBudgetModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForBudgetEdit || !budgetEditId) return;
    setSavingOrderBudget(true);
    try {
      const updated = await updateFuelOrderBudgetClassification(
        orderForBudgetEdit.id,
        budgetEditId,
        currentUser?.institution_id || 'inst_1'
      );
      setOrders(prev => prev.map(o => (o.id === updated.id || o.order_number === updated.order_number || o.id === orderForBudgetEdit.id ? (updated as any) : o)));
      setOrderForBudgetEdit(null);
      const sheetName = updated.budget_classification?.invoice_sheet || budgetEditId;
      showToast(`Dotação da ordem ${updated.order_number} atualizada para Ficha ${sheetName}!`, 'success');
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar dotação da ordem.', 'error');
    } finally {
      setSavingOrderBudget(false);
    }
  };

  // Envio de auditoria / glosa
  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForAction) return;

    try {
      await auditFuelOrder(
        selectedOrderForAction.id,
        auditForm.status,
        auditForm.justification,
        currentUser?.id
      );

      const msg = auditForm.status === 'auditado' 
        ? 'Ordem homologada e aprovada para liquidação!' 
        : 'Ordem GLOSADA! Pagamento bloqueado para apuração.';
      showToast(msg, auditForm.status === 'auditado' ? 'success' : 'error');

      setIsAuditModalOpen(false);
      setSelectedOrderForAction(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao auditar ordem.', 'error');
    }
  };

  // Cadastro de novo veículo
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleForm.plate || !newVehicleForm.model) {
      showToast('Preencha os campos obrigatórios da placa e modelo.', 'warning');
      return;
    }

    try {
      const created = await createFleetVehicle({
        institution_id: currentUser?.institution_id || 'inst_1',
        plate: newVehicleForm.plate.toUpperCase().trim(),
        prefix_code: newVehicleForm.prefix_code.toUpperCase().trim() || undefined,
        model: newVehicleForm.model.trim(),
        department: newVehicleForm.department,
        fuel_type: newVehicleForm.fuel_type,
        tank_capacity: Number(newVehicleForm.tank_capacity),
        metric_type: newVehicleForm.metric_type,
        expected_consumption: Number(newVehicleForm.expected_consumption),
        current_odometer: Number(newVehicleForm.current_odometer),
        status: 'ativo',
        budget_classification_id: newVehicleForm.budget_classification_id && newVehicleForm.budget_classification_id.trim() !== '' ? newVehicleForm.budget_classification_id : undefined,
        always_full_tank: Boolean(newVehicleForm.always_full_tank),
        is_emergency_priority: Boolean(newVehicleForm.always_full_tank) ? true : Boolean(newVehicleForm.is_emergency_priority)
      });

      setVehicles(prev => [created, ...prev.filter(v => v.id !== created.id)]);
      showToast('Veículo cadastrado na frota com sucesso!', 'success');
      setIsNewVehicleModalOpen(false);
      setNewVehicleForm({
        plate: '',
        prefix_code: '',
        model: '',
        department: 'Saúde',
        fuel_type: 'diesel_s10',
        tank_capacity: 70,
        metric_type: 'km',
        expected_consumption: 9.0,
        current_odometer: 0,
        budget_classification_id: '',
        always_full_tank: false,
        is_emergency_priority: false
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao cadastrar veículo.', 'error');
    }
  };

  // Upload de comprovante
  const handleFileUpload = async (
    orderId: string,
    file: File,
    type: 'receipt' | 'odometer' | 'invoice' | 'pump'
  ) => {
    try {
      showToast('Enviando comprovante...', 'info');
      const url = await uploadReceiptAttachment(orderId, file, type);
      showToast('Comprovante anexado com sucesso!', 'success');
      setExecutionForm(prev => {
        if (type === 'receipt') return { ...prev, receipt_attachment_url: url };
        if (type === 'odometer') return { ...prev, odometer_photo_url: url };
        if (type === 'pump') return { ...prev, pump_photo_url: url };
        return { ...prev, invoice_attachment_url: url };
      });
      loadData();
    } catch (err) {
      showToast('Erro ao anexar arquivo.', 'error');
    }
  };

  // Exportação Excel Consolidada (Audit Ready)
  const handleExportExcel = async () => {
    try {
      const columns = [
        'Número da Ordem',
        'Data de Emissão',
        'Placa',
        'Prefixo',
        'Modelo',
        'Secretaria',
        'Condutor / Motorista',
        'Posto Credenciado',
        'Combustível',
        'Preço Licitado (R$/L)',
        'Litros Autorizados',
        'Total Autorizado (R$)',
        'Litros Abastecidos',
        'Métrica',
        'Leitura Anterior',
        'Leitura no Ato',
        'Delta KM',
        'Consumo Apurado',
        'Meta de Referência',
        'Desvio de Consumo (%)',
        'Número NF/Cupom',
        'Nível de Risco TCE',
        'Status de Liquidação',
        'Motivo da Anomalia / Parecer'
      ];

      const data = orders.map(ord => {
        const v = ord.vehicle || vehicles.find(item => item.id === ord.vehicle_id);
        const delta = ord.current_odometer && ord.previous_odometer ? (ord.current_odometer - ord.previous_odometer) : 0;
        const bidded = ord.bidded_unit_price || ord.unit_price || 6.19;
        const totalAut = ord.total_authorized_value || (ord.liters_authorized * bidded);
        const consumption = ord.calculated_km_per_liter || ord.calculated_consumption;
        const dev = ord.deviation_percent !== undefined 
          ? `${ord.deviation_percent}%` 
          : (v?.expected_consumption && consumption ? `${(((consumption - v.expected_consumption) / v.expected_consumption) * 100).toFixed(1)}%` : '-');

        const anomalyLabel = ord.anomaly_level === 'bloqueio_critico' || ord.is_anomaly
          ? 'BLOQUEIO CRÍTICO'
          : ord.anomaly_level === 'alerta_amarelo'
          ? 'ALERTA MODERADO'
          : 'CONFORME';

        return {
          'Número da Ordem': ord.order_number,
          'Data de Emissão': new Date(ord.created_at).toLocaleDateString('pt-BR'),
          'Placa': v?.plate || '-',
          'Prefixo': v?.prefix_code || '-',
          'Modelo': v?.model || '-',
          'Secretaria': v?.department || '-',
          'Condutor / Motorista': ord.driver_name,
          'Posto Credenciado': ord.station_name,
          'Combustível': ord.fuel_type.toUpperCase(),
          'Preço Licitado (R$/L)': `R$ ${bidded.toFixed(3)}`,
          'Litros Autorizados': ord.liters_authorized,
          'Total Autorizado (R$)': `R$ ${totalAut.toFixed(2)}`,
          'Litros Abastecidos': ord.liters_supplied || 'Aguardando',
          'Métrica': 'Odômetro (km)',
          'Leitura Anterior': ord.previous_odometer,
          'Leitura no Ato': ord.current_odometer || '-',
          'Delta KM': delta > 0 ? `+${delta}` : '-',
          'Consumo Apurado': consumption ? `${consumption.toFixed(2)} km/l` : '-',
          'Meta de Referência': v?.expected_consumption ? `${v.expected_consumption.toFixed(2)} km/l` : '-',
          'Desvio de Consumo (%)': dev,
          'Número NF/Cupom': ord.invoice_coupon_number || ord.invoice_number || '-',
          'Nível de Risco TCE': anomalyLabel,
          'Status de Liquidação': ord.status.toUpperCase(),
          'Motivo da Anomalia / Parecer': ord.anomaly_reason || ord.audit_justification || '-'
        };
      });

      await exportToExcel(columns, data, {
        fileName: `Auditoria_Abastecimento_Frotas_${new Date().getFullYear()}`,
        sheetName: 'Abastecimentos e Auditoria',
        title: 'PREFEITURA MUNICIPAL • RELATÓRIO DE AUDITORIA DE FROTAS E COMBUSTÍVEL',
        subtitle: `Prestação de Contas TCE • Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} • Total de Ordens: ${orders.length}`,
        headerColor: 'FF0284C7' // Azul executivo institucional
      });

      showToast('Relatório consolidado exportado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar planilha Excel.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header do Módulo com Abas de Navegação */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
            <Fuel size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Controle & Auditoria de Frotas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Padrão TCE
              </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
              Ordens digitais, conciliação em três vias, validação de tanque e semáforo antifraude de consumo.
            </p>
          </div>
        </div>

        {/* Abas de Navegação e Campainha de Notificações */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          {/* Abas Principais Enxutas */}
          <div className="flex flex-wrap bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileText size={15} />
              <span>Ordens ({orders.length})</span>
              {auditMetrics.anomalousCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Há alertas no Semáforo TCE" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'vehicles'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Truck size={15} />
              <span>Frota ({vehicles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('drivers')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'drivers'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Users size={15} />
              <span>Motoristas ({drivers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('stations')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'stations'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Store size={15} />
              <span>Postos ({stations.length})</span>
            </button>
          </div>

          {/* Campainha Minimalista: Abastecimentos no Posto (Bomba + Odômetro) */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              type="button"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              title="Abastecimentos no Posto (Fotos da Bomba e Odômetro)"
              className={`relative p-2.5 rounded-2xl transition-all cursor-pointer border flex items-center justify-center ${
                unreadNotificationsCount > 0
                  ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 shadow-xs'
                  : 'bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {unreadNotificationsCount > 0 ? (
                <BellRing size={19} className={bellAnimate ? 'animate-bounce text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'} />
              ) : (
                <Bell size={19} className="text-neutral-500 dark:text-neutral-400" />
              )}

              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 flex items-center justify-center text-[10px] font-black text-white bg-emerald-600 rounded-full shadow-xs">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Popover Minimalista focado em Abastecimentos e Fotos do Posto */}
            <AnimatePresence>
              {isNotificationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 mt-2 w-80 sm:w-88 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 z-50 overflow-hidden flex flex-col max-h-[75vh]"
                >
                  {/* Cabeçalho Minimalista */}
                  <div className="px-3.5 py-2.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-black text-neutral-900 dark:text-white">
                        Abastecimentos no Posto
                      </span>
                      {unreadNotificationsCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      {unreadNotificationsCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsAsRead}
                          className="px-2 py-1 text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg cursor-pointer font-semibold transition-colors"
                        >
                          Lidas
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={clearNotificationHistory}
                          title="Limpar avisos"
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista Enxuta com Miniaturas da Bomba e Odômetro */}
                  <div className="overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[340px]">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-8 px-4 text-center text-neutral-400">
                        <Camera size={22} className="mx-auto mb-1.5 opacity-40" />
                        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                          Sem novos abastecimentos no posto
                        </p>
                        <p className="text-[11px] mt-0.5 text-neutral-400">
                          Você será avisado aqui assim que enviarem as fotos da bomba e do odômetro.
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map(notif => {
                        const isUnread = !notif.read;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                              isUnread
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                            }`}
                          >
                            {/* Dados Principais Minimalistas */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {isUnread && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                )}
                                <span className="font-mono text-xs font-black text-neutral-900 dark:text-white">
                                  {notif.plate || notif.orderNumber}
                                </span>
                                <span className="text-[11px] text-neutral-500 truncate">
                                  • {notif.vehicleModel || 'Veículo'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                  {Number(notif.liters || 0).toFixed(1)} L
                                </span>
                                {notif.currentOdometer ? (
                                  <span className="font-mono">
                                    • KM {formatThousands(notif.currentOdometer)}
                                  </span>
                                ) : null}
                                <span className="text-[10px] text-neutral-400">
                                  • {formatRelativeNotificationTime(notif.timestamp)}
                                </span>
                              </div>
                            </div>

                            {/* Miniaturas das Fotos da Bomba e do Odômetro */}
                            <div className="flex items-center gap-1 shrink-0">
                              {notif.pumpPhotoUrl ? (
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100" title="Foto da Bomba">
                                  <img src={notif.pumpPhotoUrl} alt="Bomba" className="w-full h-full object-cover" />
                                  <span className="absolute bottom-0 inset-x-0 bg-black/65 text-[7px] text-white text-center font-bold uppercase leading-tight">
                                    Bomba
                                  </span>
                                </div>
                              ) : null}

                              {notif.odometerPhotoUrl ? (
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100" title="Foto do Odômetro">
                                  <img src={notif.odometerPhotoUrl} alt="Odômetro" className="w-full h-full object-cover" />
                                  <span className="absolute bottom-0 inset-x-0 bg-black/65 text-[7px] text-white text-center font-bold uppercase leading-tight">
                                    KM
                                  </span>
                                </div>
                              ) : null}

                              {!notif.pumpPhotoUrl && !notif.odometerPhotoUrl && (
                                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                  <Fuel size={14} />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. KPIs Interativos de Auditoria e Conformidade (Clique para Filtrar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Litros & Despesa */}
        <div
          onClick={() => {
            setActiveTab('orders');
            setStatusFilter('all');
            setDepartmentFilter('all');
            setSearchTerm('');
          }}
          title="Clique para exibir todas as ordens do exercício"
          className={`bg-white dark:bg-neutral-900 p-5 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md ${
            statusFilter === 'all' && departmentFilter === 'all' && !searchTerm
              ? 'border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-500/20'
              : 'border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Litros Fornecidos</span>
            <Fuel size={16} className="text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
              {auditMetrics.totalLiters} <span className="text-sm font-semibold text-neutral-500">L</span>
            </h3>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {auditMetrics.totalSpent}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Acumulado em {auditMetrics.totalOrders} {auditMetrics.totalOrders === 1 ? 'ordem' : 'ordens'}
          </p>
        </div>

        {/* Card 2: Consumo Médio & Pendentes de Homologação */}
        <div
          onClick={() => {
            setActiveTab('orders');
            setStatusFilter(statusFilter === 'abastecido' ? 'all' : 'abastecido');
          }}
          title="Clique para filtrar ordens abastecidas pendentes de homologação"
          className={`p-5 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md ${
            statusFilter === 'abastecido'
              ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Rendimento & Bomba</span>
            <Gauge size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
              {auditMetrics.avgConsumption} <span className="text-sm font-semibold text-neutral-500">km/l</span>
            </h3>
            {auditMetrics.pendingHomologationCount > 0 ? (
              <span className="inline-flex items-center text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                {auditMetrics.pendingHomologationCount} p/ homologar
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <TrendingUp size={12} className="mr-1" /> Eficiente
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {statusFilter === 'abastecido' ? 'Exibindo pendentes de homologação' : 'Clique p/ ver abastecidos no posto'}
          </p>
        </div>

        {/* Card 3: Ordens Homologadas */}
        <div
          onClick={() => {
            setActiveTab('orders');
            setStatusFilter(statusFilter === 'auditado' ? 'all' : 'auditado');
          }}
          title="Clique para filtrar as ordens já auditadas e homologadas"
          className={`p-5 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md ${
            statusFilter === 'auditado'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Ordens Homologadas</span>
            <FileCheck size={16} className="text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
              {auditMetrics.auditedCount} <span className="text-sm font-semibold text-neutral-500">/ {auditMetrics.totalOrders}</span>
            </h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
              {auditMetrics.totalOrders > 0 ? Math.round((auditMetrics.auditedCount / auditMetrics.totalOrders) * 100) : 0}%
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {statusFilter === 'auditado' ? 'Exibindo apenas homologadas' : 'Prontas para liquidação (clique p/ filtrar)'}
          </p>
        </div>

        {/* Card 4: Semáforo de Anomalias (Destaque Vermelho) */}
        <div 
          onClick={() => {
            setActiveTab('orders');
            setStatusFilter(statusFilter === 'anomalia_critica' ? 'all' : 'anomalia_critica');
          }}
          title="Clique para filtrar apenas as ordens com anomalia no Semáforo TCE"
          className={`p-5 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md ${
            statusFilter === 'anomalia_critica'
              ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : auditMetrics.anomalousCount > 0
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Anomalias & Glosas</span>
            <AlertTriangle size={16} className={auditMetrics.anomalousCount > 0 ? 'text-rose-600 animate-bounce' : 'text-neutral-400'} />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className={`text-2xl font-black ${auditMetrics.anomalousCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
              {auditMetrics.anomalousCount}
            </h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              auditMetrics.anomalousCount > 0 
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
            }`}>
              {auditMetrics.anomalousCount > 0 ? 'Ação Imediata' : 'Zero Riscos'}
            </span>
          </div>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">
            {statusFilter === 'anomalia_critica' ? 'Filtro do semáforo ativo (clique para limpar)' : 'Desvios de tanque ou consumo (clique para filtrar)'}
          </p>
        </div>
      </div>

      {/* 3. Barra de Pesquisa e Ações Clean (Opções e Tabelas centralizadas em Janela Popup) */}
      <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Pesquisa & Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Pesquisar Ordem, Placa, Veículo, Motorista ou Secretaria..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full cursor-pointer"
                title="Limpar pesquisa"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">Todas as Secretarias</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {(searchTerm || departmentFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('all');
                setStatusFilter('all');
              }}
              className="flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 shrink-0"
              title="Limpar filtros ativos"
            >
              <X size={14} />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Botões Principais Enxutos (Janelas Popup) */}
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsToolsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-all cursor-pointer border border-neutral-200 dark:border-neutral-700"
            title="Abrir janela com Preços Licitados, Fichas Orçamentárias, Canhotos Antigos e Exportação TCE"
          >
            <Sliders size={14} className="text-amber-600 dark:text-amber-400" />
            <span>Opções & Ferramentas</span>
          </button>

          {activeTab === 'vehicles' ? (
            <button
              onClick={() => setIsNewVehicleModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Veículo</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewOrder}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Emitir Ordem Digital</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. CONTEÚDO PRINCIPAL: ABA 1 (Ordens, Emissão & Semáforo Integrado) */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          {/* Barra de Abas de Filtro Rápido & Homologação em Lote */}
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  statusFilter === 'all'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border-transparent shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span>Todas</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'all' ? 'bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900' : 'bg-neutral-200 dark:bg-neutral-700'
                }`}>
                  {auditMetrics.totalOrders}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'autorizado' ? 'all' : 'autorizado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  statusFilter === 'autorizado'
                    ? 'bg-amber-500 text-white border-transparent shadow-xs'
                    : 'bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100/70'
                }`}
              >
                <span>⏳ Aguardando Posto</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'autorizado' ? 'bg-white/25 text-white' : 'bg-amber-200/70 dark:bg-amber-900/70'
                }`}>
                  {auditMetrics.waitingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'abastecido' ? 'all' : 'abastecido')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  statusFilter === 'abastecido'
                    ? 'bg-blue-600 text-white border-transparent shadow-xs'
                    : 'bg-blue-50/60 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100/70'
                }`}
              >
                <span>⛽ Para Homologar</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'abastecido' ? 'bg-white/25 text-white' : 'bg-blue-200/70 dark:bg-blue-900/70'
                }`}>
                  {auditMetrics.pendingHomologationCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'auditado' ? 'all' : 'auditado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  statusFilter === 'auditado'
                    ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                    : 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100/70'
                }`}
              >
                <span>🟢 Homologadas</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'auditado' ? 'bg-white/25 text-white' : 'bg-emerald-200/70 dark:bg-emerald-900/70'
                }`}>
                  {auditMetrics.auditedCount}
                </span>
              </button>

              {auditMetrics.anomalousCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'anomalia_critica' ? 'all' : 'anomalia_critica')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                    statusFilter === 'anomalia_critica'
                      ? 'bg-rose-600 text-white border-transparent shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                  }`}
                >
                  <span>🔴 Alertas / Glosas</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    statusFilter === 'anomalia_critica' ? 'bg-white/25 text-white' : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200'
                  }`}>
                    {auditMetrics.anomalousCount}
                  </span>
                </button>
              )}
            </div>

            {auditMetrics.conformePendingCount > 0 && (
              <button
                type="button"
                onClick={handleBatchHomologateConformes}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-600/20 shrink-0"
                title="Homologar de uma só vez todas as ordens abastecidas que estão 100% conformes no Semáforo TCE"
              >
                <ShieldCheck size={15} />
                <span>Homologar Conformes ({auditMetrics.conformePendingCount})</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th 
                    className="px-4 py-3.5 cursor-pointer select-none group hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    onClick={toggleOrderNumberSort}
                    title="Clique para ordenar por Número da Ordem (Crescente / Decrescente)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={orderNumberSort !== 'none' ? 'text-amber-600 dark:text-amber-400 font-black' : ''}>
                        Ordem
                      </span>
                      {orderNumberSort === 'asc' ? (
                        <ArrowUp size={11} className="text-blue-600" />
                      ) : orderNumberSort === 'desc' ? (
                        <ArrowDown size={11} className="text-amber-600" />
                      ) : (
                        <ArrowUpDown size={11} className="text-neutral-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3.5">Veículo & Secretaria</th>
                  <th className="px-4 py-3.5">Condutor</th>
                  <th className="px-4 py-3.5">Volume, Valor & KM</th>
                  <th className="px-4 py-3.5">Semáforo TCE</th>
                  <th className="px-4 py-3.5 text-right">Janela da Ordem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-neutral-400">
                      <Fuel size={36} className="mx-auto text-amber-500 mb-2 opacity-60" />
                      <p className="font-bold text-neutral-800 dark:text-white">
                        {orders.length === 0 ? 'Nenhuma ordem de abastecimento emitida ainda' : 'Nenhuma ordem encontrada para este filtro'}
                      </p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                        {orders.length === 0
                          ? `A frota de ${vehicles.length} veículos está pronta. Clique em "Emitir Ordem Digital" para começar.`
                          : 'Experimente limpar os filtros ou pesquisar por outro termo.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(order => {
                    const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
                    const { effectiveLiters, formattedValue } = resolveOrderFinancials(order, biddedPrices);
                    const isFirstRecord = !order.previous_odometer || order.previous_odometer <= 0;
                    const deltaKm = (!isFirstRecord && order.current_odometer && order.previous_odometer && order.current_odometer > order.previous_odometer)
                      ? order.current_odometer - order.previous_odometer
                      : 0;
                    const activeBc = resolveOrderBudget(order, v, budgetClassifications);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => {
                          if (order.status === 'autorizado' || order.status === 'autorizado_pendente') {
                            handleOpenExecution(order);
                          } else {
                            handleOpenOrderHub(order);
                          }
                        }}
                        className="hover:bg-neutral-50/90 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
                      >
                        {/* 1. Número da Ordem & Data */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-black text-sm text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors block">
                            {order.order_number}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </td>

                        {/* 2. Veículo & Secretaria */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <MercosulPlate plate={v?.plate} size="xs" />
                            <div>
                              <span className="font-bold text-neutral-900 dark:text-white block">
                                {v?.model || 'Veículo Municipal'}
                              </span>
                              <span className="text-[11px] text-neutral-400">
                                {v?.department || '-'} {activeBc?.invoice_sheet ? `• Ficha ${activeBc.invoice_sheet}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Condutor */}
                        <td className="px-4 py-3.5">
                          <div className="text-neutral-900 dark:text-white font-semibold">
                            {order.driver_name}
                          </div>
                          {order.station_name && (
                            <div className="text-[11px] text-neutral-400 truncate max-w-[160px]">
                              {order.station_name}
                            </div>
                          )}
                        </td>

                        {/* 4. Volume, Valor & KM */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-mono font-black text-xs text-neutral-900 dark:text-white">
                            {effectiveLiters.toFixed(1)} L <span className="text-neutral-400 font-normal">•</span>{' '}
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {formattedValue}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono">
                            {order.current_odometer && order.current_odometer > 0
                              ? `KM ${formatThousands(order.current_odometer)}${deltaKm > 0 ? ` (+${formatThousands(deltaKm)})` : isFirstRecord ? ' (Base)' : ''}`
                              : `${order.fuel_type.replace('_', ' ').toUpperCase()}`}
                          </div>
                        </td>

                        {/* 5. Semáforo TCE Limpo */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {order.status === 'glosado' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white">
                              <Ban size={12} /> Glosado
                            </span>
                          ) : order.anomaly_level === 'bloqueio_critico' || order.is_anomaly ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <AlertTriangle size={12} className="text-rose-600" /> Bloqueio TCE
                            </span>
                          ) : order.anomaly_level === 'alerta_amarelo' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <AlertTriangle size={12} className="text-amber-600" /> Alerta Consumo
                            </span>
                          ) : order.status === 'auditado' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <ShieldCheck size={12} className="text-emerald-600" /> Homologado
                            </span>
                          ) : order.status === 'abastecido' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <CheckCircle2 size={12} className="text-emerald-600" /> Pronto p/ Homologar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Aguardando Posto
                            </span>
                          )}
                        </td>

                        {/* 6. Único Botão Principal que Abre a Janela Popup da Ordem */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {(order.status === 'autorizado' || order.status === 'autorizado_pendente') ? (
                              <button
                                onClick={() => handleOpenExecution(order)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                              >
                                <Gauge size={13} />
                                <span>Baixar / KM</span>
                              </button>
                            ) : order.status === 'abastecido' ? (
                              <button
                                onClick={() => handleOpenOrderHub(order)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                              >
                                <ShieldCheck size={13} />
                                <span>Homologar / Abrir</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenOrderHub(order)}
                                className="px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700"
                              >
                                <Eye size={13} />
                                <span>Gerenciar Ordem</span>
                              </button>
                            )}

                            <button
                              onClick={() => imprimirCanhotoDuasVias(order as any, v)}
                              title="Imprimir Canhoto em 2 Vias (A4)"
                              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação de 30 itens por página */}
          {renderPagination(currentPage, totalPagesOrders, filteredOrders.length, setCurrentPage)}
        </div>
      )}

      {/* 5. CONTEÚDO PRINCIPAL: ABA 2 (Lançamento de Canhotos & Baixa) */}
      {activeTab === 'execution' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <strong className="block font-bold mb-0.5">Conferência de Abastecimento na Bomba (Lei 4.320/64)</strong>
              As ordens abastecidas recebem diretamente via QR Code as fotos do visor da bomba e do painel/odômetro do veículo para auditoria do Controle Interno, sem necessidade de anexar Nota Fiscal nesta etapa.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingExecutionOrders.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-neutral-900 p-12 text-center rounded-3xl border border-neutral-100 dark:border-neutral-800 text-neutral-400">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-bold text-neutral-800 dark:text-white">
                  {orders.length === 0 ? 'Nenhuma ordem emitida ainda' : 'Nenhuma ordem pendente de lançamento encontrada'}
                </p>
                <p className="text-xs mt-1">
                  {searchTerm.trim() ? 'Tente ajustar os termos da pesquisa.' : 'Todas as ordens emitidas já foram liquidadas ou lançadas!'}
                </p>
              </div>
            ) : (
              paginatedExecutionOrders.map(order => {
                const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
                return (
                  <div key={order.id} className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {order.order_number}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                          Aguardando Canhoto
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                        {v?.model || 'Veículo Municipal'}
                      </h4>
                      <div className="flex items-center gap-2 mb-3">
                        <MercosulPlate plate={v?.plate} size="xs" />
                        <span className="text-xs text-neutral-500">
                          Prefixo: <strong className="text-neutral-700 dark:text-neutral-300">{v?.prefix_code || '-'}</strong>
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl mb-4">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Condutor:</span>
                          <span className="font-semibold">{order.driver_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Combustível:</span>
                          <span className="font-semibold uppercase">{order.fuel_type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Litragem Autorizada:</span>
                          <span className="font-bold text-emerald-600">{order.liters_authorized.toFixed(2)} L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Leitura Anterior:</span>
                          <span className="font-mono">{order.previous_odometer} km</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        onClick={() => imprimirCanhotoDuasVias(order as any, v)}
                        className="flex-1 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Printer size={14} />
                        Reimprimir
                      </button>

                      <button
                        onClick={() => handleOpenExecution(order)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                          order.status === 'abastecido'
                            ? 'text-amber-800 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60'
                            : 'text-white bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {order.status === 'abastecido' ? (
                          <>
                            <Edit2 size={14} />
                            Editar Dados
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            Baixar Canhoto
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Paginação de 30 itens por página */}
          {renderPagination(currentPage, totalPagesExecution, pendingExecutionOrders.length, setCurrentPage)}
        </div>
      )}

      {/* 6. CONTEÚDO PRINCIPAL: ABA 3 (Auditoria e Semáforo Antifraude) */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Conciliação em Três Vias (Ordem x NF x Canhoto)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    Controle Interno
                  </span>
                </h4>
                <p className="text-neutral-400 text-xs">Cruzamento automatizado de litragem física, desvio de consumo e verificação documental</p>
              </div>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-xl cursor-pointer"
              >
                <Download size={14} />
                Exportar Relatório TCE
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="px-4 py-3.5">Placa & Veículo</th>
                    <th className="px-4 py-3.5">Condutor</th>
                    <th className="px-4 py-3.5">Litragem (Aut. vs Real)</th>
                    <th className="px-4 py-3.5">Odômetro / Delta</th>
                    <th className="px-4 py-3.5">Consumo Apurado</th>
                    <th className="px-4 py-3.5">Comprovantes</th>
                    <th className="px-4 py-3.5">Semáforo / Anomalia</th>
                    <th className="px-4 py-3.5 text-right">Decisão Auditor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-neutral-400">
                        Nenhuma ordem auditável encontrada.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map(order => {
                      const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
                      const isFirstRecord = !order.previous_odometer || order.previous_odometer <= 0;
                      const deltaOdo = (!isFirstRecord && order.current_odometer && order.previous_odometer && order.current_odometer > order.previous_odometer)
                        ? order.current_odometer - order.previous_odometer 
                        : 0;
                      const rawConsump = Number(order.calculated_consumption ?? order.calculated_km_per_liter ?? 0);
                      const isValidConsump = !isFirstRecord && deltaOdo > 0 && !isNaN(rawConsump) && rawConsump > 0 && rawConsump <= 50;
                      const { formattedValue } = resolveOrderFinancials(order, biddedPrices);

                      return (
                        <tr 
                          key={order.id} 
                          className={`transition-colors ${
                            order.is_anomaly 
                              ? 'bg-rose-50/40 dark:bg-rose-950/15 hover:bg-rose-50/70' 
                              : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40'
                          }`}
                        >
                          {/* Veículo */}
                          <td className="px-4 py-3.5">
                            <div className="mb-1">
                              <MercosulPlate plate={v?.plate} size="xs" />
                            </div>
                            <div className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                              {v?.model}
                            </div>
                            <div className="text-[10px] text-neutral-400">
                              {v?.department} • {order.order_number}
                            </div>
                            {order.is_full_tank_order && (
                              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                🚨 Tanque Cheio (Prontidão)
                              </span>
                            )}
                          </td>

                          {/* Condutor */}
                          <td className="px-4 py-3.5 text-neutral-800 dark:text-neutral-200">
                            <div className="font-semibold">{order.driver_name}</div>
                            <div className="text-[10px] text-neutral-400">{order.station_name}</div>
                          </td>

                          {/* Litros */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-neutral-900 dark:text-white font-bold">
                              <span>{order.liters_supplied ? `${order.liters_supplied.toFixed(2)} L` : 'Pendente'}</span>
                              <span className="text-neutral-400 font-normal">
                                / {order.supply_mode === 'encher_tanque' || order.is_full_tank_order ? 'Top-Off' : `${order.liters_authorized.toFixed(0)} L`}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono">
                              Total: {formattedValue}
                            </div>
                          </td>

                          {/* Odômetro */}
                          <td className="px-4 py-3.5 font-mono">
                            <div>Atual: <strong>{order.current_odometer ? formatThousands(order.current_odometer) : '-'}</strong></div>
                            <div className="text-[10px] text-neutral-400">
                              {isFirstRecord ? '1º Registro (Base)' : `Ant.: ${formatThousands(order.previous_odometer || 0)}`}
                            </div>
                            {deltaOdo > 0 && (
                              <span className="text-[10px] font-bold text-emerald-600">
                                +{formatThousands(deltaOdo)} {v?.metric_type} rodados
                              </span>
                            )}
                          </td>

                          {/* Consumo */}
                          <td className="px-4 py-3.5">
                            {isValidConsump ? (
                              <div>
                                <span className="font-black text-xs text-neutral-900 dark:text-white">
                                  {rawConsump.toFixed(2)} km/l
                                </span>
                                <span className="text-[10px] text-neutral-400 block">
                                  Ref.: {v?.expected_consumption?.toFixed(2) || '—'}
                                </span>
                              </div>
                            ) : isFirstRecord ? (
                              <div>
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                                  Odômetro Base
                                </span>
                                <span className="text-[10px] text-neutral-400 block">
                                  1º abastecimento
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[10px]">Aguardando cálculo</span>
                            )}
                          </td>

                          {/* Comprovantes */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {order.pump_photo_url && (
                                <button
                                  onClick={() => openAttachmentViewer(order, 'pump')}
                                  className="p-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:scale-105 transition-transform flex items-center gap-0.5 cursor-pointer"
                                  title="Ver Foto da Bomba"
                                >
                                  <Camera size={14} />
                                </button>
                              )}

                              {order.odometer_photo_url && (
                                <button
                                  onClick={() => openAttachmentViewer(order, 'odometer')}
                                  className="p-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:scale-105 transition-transform flex items-center gap-0.5 cursor-pointer"
                                  title="Ver Foto do Odômetro"
                                >
                                  <Gauge size={14} />
                                </button>
                              )}

                              {(order.receipt_attachment_url || order.receipt_photo_url) ? (
                                <button
                                  onClick={() => openAttachmentViewer(order, 'receipt')}
                                  className="p-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:scale-105 transition-transform cursor-pointer"
                                  title="Ver Canhoto Assinado"
                                >
                                  <FileCheck size={14} />
                                </button>
                              ) : (
                                !order.pump_photo_url && !order.odometer_photo_url && (
                                  <span className="text-neutral-300 dark:text-neutral-700" title="Sem fotos anexadas">
                                    <FileText size={14} />
                                  </span>
                                )
                              )}

                              {(order.pump_photo_url || order.odometer_photo_url || order.receipt_attachment_url || order.receipt_photo_url) ? (
                                <button
                                  onClick={() => openAttachmentViewer(order)}
                                  className="text-blue-600 hover:text-blue-800 text-[11px] font-bold underline ml-0.5 cursor-pointer"
                                >
                                  Ver Fotos
                                </button>
                              ) : null}
                            </div>
                          </td>

                          {/* Semáforo / Anomalia */}
                          <td className="px-4 py-3.5 max-w-[220px]">
                            {order.anomaly_level === 'bloqueio_critico' || order.is_anomaly ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-rose-600 text-white animate-pulse">
                                  <AlertTriangle size={11} />
                                  🔴 Bloqueio Crítico TCE
                                </span>
                                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 leading-tight">
                                  {order.anomaly_reason || 'Inconsistência grave no odômetro ou consumo discrepante (>25%).'}
                                </div>
                              </div>
                            ) : order.anomaly_level === 'alerta_amarelo' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-amber-500 text-white">
                                  <AlertTriangle size={11} />
                                  🟡 Alerta de Consumo
                                </span>
                                <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 leading-tight">
                                  {order.anomaly_reason || 'Desvio moderado de consumo entre 15% e 25%.'}
                                </div>
                              </div>
                            ) : (order.status === 'autorizado' || order.status === 'autorizado_pendente') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                <Clock size={11} />
                                Aguardando Posto
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <CheckCircle2 size={11} />
                                🟢 Conforme
                              </span>
                            )}
                          </td>

                          {/* Decisão Auditor */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.status === 'glosado' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    Glosado (Bloqueado)
                                  </span>
                                  <button
                                    onClick={() => handleCancelHomologation(order)}
                                    title="Cancelar Glosa e Reabrir para Edição"
                                    className="px-2 py-1 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-neutral-300 dark:border-neutral-700"
                                  >
                                    <RotateCcw size={11} />
                                    <span>Reabrir</span>
                                  </button>
                                </div>
                              ) : order.status === 'auditado' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 size={11} />
                                    Homologado
                                  </span>
                                  <button
                                    onClick={() => handleCancelHomologation(order)}
                                    title="Cancelar homologação para poder editar ou corrigir erros"
                                    className="px-2 py-1 text-[10px] font-bold text-rose-700 hover:text-rose-900 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-800 shadow-xs"
                                  >
                                    <RotateCcw size={11} className="text-rose-600 dark:text-rose-400" />
                                    <span>Cancelar Homologação</span>
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedOrderForAction(order);
                                      setAuditForm({
                                        status: 'auditado',
                                        justification: 'Documentação física, odômetro e notas fiscais conferidas em conformidade com as diretrizes do Tribunal de Contas.'
                                      });
                                      setIsAuditModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                                    title="Aprovar e homologar ordem para liquidação contábil"
                                  >
                                    Aprovar
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSelectedOrderForAction(order);
                                      setAuditForm({
                                        status: 'glosado',
                                        justification: order.anomaly_reason || 'Glosa e bloqueio cautelar de pagamento por inconsistência técnica no odômetro ou consumo.'
                                      });
                                      setIsAuditModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                                    title="Glosar e bloquear pagamento para averiguação"
                                  >
                                    Glosar
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleOpenBudgetModal(order)}
                                title="Editar / Alterar Dotação Orçamentária vinculada"
                                className="flex items-center gap-1 px-2 py-1 text-amber-800 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border border-amber-200/70 dark:border-amber-900/40"
                              >
                                <Layers size={11} className="text-amber-600 dark:text-amber-400" />
                                <span>Dotação</span>
                              </button>

                              <button
                                onClick={() => handleDeleteOrder(order)}
                                title="Excluir Registro de Auditoria / Ordem"
                                className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition-colors cursor-pointer ml-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação de 30 itens por página */}
            {renderPagination(currentPage, totalPagesOrders, filteredOrders.length, setCurrentPage)}
          </div>
        </div>
      )}

      {/* 7. CONTEÚDO PRINCIPAL: ABA 4 (Gestão da Frota & Veículos) */}
      {activeTab === 'vehicles' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                  Cadastro Técnico de Veículos e Máquinas Pesadas
                </h4>
                <span className="text-xs font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                  {filteredVehiclesList.length} {filteredVehiclesList.length === 1 ? 'veículo' : 'veículos'}
                </span>
              </div>
              <p className="text-neutral-400 text-xs">Capacidades de tanque, parâmetros de consumo e controle de odômetro</p>
            </div>
            <div className="flex items-center gap-2">
              {vehicles.length > 0 && (
                <button
                  onClick={handleClearAllFleet}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-800 rounded-xl transition-all cursor-pointer"
                  title="Excluir todos os veículos da frota municipal atual"
                >
                  <Trash2 size={13} /> Excluir Toda a Frota
                </button>
              )}
              <button
                onClick={() => setIsNewVehicleModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl cursor-pointer"
              >
                <Plus size={14} /> Cadastrar Veículo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3.5">Placa Oficial</th>
                  <th className="px-4 py-3.5">Prefixo</th>
                  <th className="px-4 py-3.5">Modelo / Marca</th>
                  <th className="px-4 py-3.5">Secretaria</th>
                  <th className="px-4 py-3.5">Combustível</th>
                  <th className="px-4 py-3.5">Capacidade Tanque</th>
                  <th className="px-4 py-3.5">Consumo Esperado</th>
                  <th className="px-4 py-3.5">Odômetro Atual</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                {filteredVehiclesList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-neutral-400">
                      <Truck size={36} className="mx-auto text-neutral-400 mb-2 opacity-60" />
                      <p className="font-bold text-neutral-800 dark:text-white">
                        {vehicles.length === 0 ? 'Nenhum veículo cadastrado na frota' : 'Nenhum veículo encontrado para esta pesquisa'}
                      </p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                        {vehicles.length === 0
                          ? 'A frota municipal está limpa. Clique em "Cadastrar Novo Veículo" para adicionar os veículos da frota.'
                          : 'Tente alterar os termos da pesquisa ou os filtros de secretaria/status acima.'}
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setIsNewVehicleModalOpen(true)}
                          className="px-4 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} /> Cadastrar Novo Veículo
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedVehicles.map(vehicle => (
                    <tr key={vehicle.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <MercosulPlate plate={vehicle.plate} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 font-bold text-neutral-700 dark:text-neutral-300">
                        {vehicle.prefix_code || '-'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{vehicle.model}</span>
                          {vehicle.is_emergency_priority && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              🚨 Prontidão 24h
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                        {vehicle.department}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {vehicle.fuel_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                        {vehicle.tank_capacity.toFixed(2)} L
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-600">
                        {vehicle.expected_consumption.toFixed(2)} km/l
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-800 dark:text-neutral-200">
                        {vehicle.current_odometer.toLocaleString('pt-BR')} km
                      </td>
                      <td className="px-4 py-3.5">
                        {vehicle.status === 'ativo' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 size={10} /> Ativo
                          </span>
                        )}
                        {vehicle.status === 'manutencao' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            <AlertCircle size={10} /> Manutenção
                          </span>
                        )}
                        {vehicle.status === 'baixado' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            <Ban size={10} /> Baixado
                          </span>
                        )}
                        {vehicle.status === 'inativo' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditVehicle(vehicle)}
                            title="Editar Dados do Veículo"
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(vehicle)}
                            title="Excluir / Baixar Veículo da Frota"
                            className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação de 30 itens por página */}
          {renderPagination(currentPage, totalPagesVehicles, filteredVehiclesList.length, setCurrentPage)}
        </div>
      )}

      {/* 8. CONTEÚDO PRINCIPAL: ABA 5 (Gestão de Motoristas / Condutores) */}
      {activeTab === 'drivers' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-amber-500" />
                Cadastro Oficial de Motoristas e Condutores
              </h4>
              <p className="text-neutral-400 text-xs">Identificação de condutores, CPF, data de nascimento e lotação funcional</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar motorista, CPF ou secretaria..."
                  value={driverSearchTerm}
                  onChange={e => {
                    setDriverSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-7 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none"
                />
                {driverSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setDriverSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full cursor-pointer"
                    title="Limpar busca"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    showToast('Sincronizando motoristas com a nuvem Supabase...', 'info');
                    await syncLocalDriversAndStationsToSupabase(currentUser?.institution_id || 'inst_1');
                    await loadData(true);
                    showToast('Motoristas sincronizados com a nuvem com sucesso!', 'success');
                  } catch (err: any) {
                    showToast(err.message || 'Erro na sincronização.', 'error');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl cursor-pointer shrink-0 border border-amber-300 dark:border-amber-800 transition"
                title="Sincronizar motoristas com a nuvem Supabase"
              >
                <CloudUpload size={14} className="text-amber-600 dark:text-amber-400" />
                Sincronizar Nuvem
              </button>
              {drivers.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllDrivers}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl cursor-pointer shrink-0 border border-rose-300 dark:border-rose-800 transition shadow-sm"
                  title="Excluir todos os motoristas cadastrados e zerar o banco de dados"
                >
                  <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                  Limpar Todos
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDepartmentsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl cursor-pointer shrink-0 border border-indigo-300 dark:border-indigo-800 transition"
                title="Cadastrar, excluir e padronizar secretarias oficiais do município"
              >
                <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                Secretarias ({officialDepartments.length})
              </button>
              <button
                type="button"
                onClick={() => setIsDriverBatchModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl cursor-pointer shrink-0 border border-neutral-300 dark:border-neutral-700 transition"
              >
                <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                Importar Planilha (.xlsx)
              </button>
              <button
                onClick={handleOpenNewDriver}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl cursor-pointer shrink-0"
              >
                <Plus size={14} /> Novo Motorista
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3.5">Nome Completo</th>
                  <th className="px-4 py-3.5">CPF</th>
                  <th className="px-4 py-3.5">Data de Nascimento</th>
                  <th className="px-4 py-3.5">Secretaria / Lotação</th>
                  <th className="px-4 py-3.5">CNH / Categoria</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-neutral-400">
                      <Users size={36} className="mx-auto text-amber-500 mb-2 opacity-60" />
                      <p className="font-bold text-neutral-800 dark:text-white">
                        {drivers.length === 0 ? 'Nenhum motorista cadastrado ainda' : 'Nenhum motorista encontrado para os filtros selecionados'}
                      </p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                        {drivers.length === 0
                          ? 'Cadastre os condutores oficiais com Nome Completo, CPF, Data de Nascimento e Secretaria para emissão ágil de ordens.'
                          : 'Tente alterar os termos da busca ou ajustar os filtros de secretaria e status acima.'}
                      </p>
                      {drivers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDriverSearchTerm('');
                            setSearchTerm('');
                            setDepartmentFilter('all');
                            setStatusFilter('all');
                            setCurrentPage(1);
                          }}
                          className="mt-3 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          Limpar Todos os Filtros
                        </button>
                      )}
                      {drivers.length === 0 && (
                        <button
                          onClick={handleOpenNewDriver}
                          className="mt-4 px-4 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} /> Cadastrar Primeiro Motorista
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedDrivers.map(driver => (
                    <tr key={driver.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                        {driver.full_name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                        {driver.cpf || <span className="text-neutral-400 italic font-sans font-normal">Não informado</span>}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                        {driver.birth_date ? new Date(driver.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                        {driver.department}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          {driver.cnh_number || '-'} {driver.cnh_category ? `(Cat. ${driver.cnh_category})` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {driver.status === 'ativo' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 size={10} /> Ativo
                          </span>
                        )}
                        {driver.status === 'afastado' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            <AlertCircle size={10} /> Afastado
                          </span>
                        )}
                        {driver.status === 'inativo' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditDriver(driver)}
                            title="Editar Motorista"
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(driver)}
                            title="Excluir Motorista"
                            className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação de 30 itens por página */}
          {renderPagination(currentPage, totalPagesDrivers, filteredDrivers.length, setCurrentPage)}
        </div>
      )}

      {/* 9. CONTEÚDO PRINCIPAL: ABA 6 (Gestão de Postos Credenciados) */}
      {activeTab === 'stations' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Store size={16} className="text-amber-500" />
                Rede de Postos Conveniados Credenciados
              </h4>
              <p className="text-neutral-400 text-xs">Fornecedores habilitados para fornecimento de combustível à frota</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar posto ou CNPJ..."
                  value={stationSearchTerm}
                  onChange={e => setStationSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    showToast('Sincronizando postos com a nuvem Supabase...', 'info');
                    await syncLocalDriversAndStationsToSupabase(currentUser?.institution_id || 'inst_1');
                    await loadData(true);
                    showToast('Postos credenciados sincronizados com a nuvem!', 'success');
                  } catch (err: any) {
                    showToast(err.message || 'Erro na sincronização.', 'error');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl cursor-pointer shrink-0 border border-amber-300 dark:border-amber-800 transition"
                title="Sincronizar postos com a nuvem Supabase"
              >
                <CloudUpload size={14} className="text-amber-600 dark:text-amber-400" />
                Sincronizar Nuvem
              </button>
              {stations.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllStations}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl cursor-pointer shrink-0 border border-rose-300 dark:border-rose-800 transition shadow-sm"
                  title="Excluir todos os postos credenciados e zerar o banco de dados"
                >
                  <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                  Limpar Todos
                </button>
              )}
              <button
                onClick={handleOpenNewStation}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl cursor-pointer shrink-0"
              >
                <Plus size={14} /> Novo Posto
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3.5">Razão Social / Nome Fantasia</th>
                  <th className="px-4 py-3.5">CNPJ</th>
                  <th className="px-4 py-3.5">Endereço / Localização</th>
                  <th className="px-4 py-3.5">Município / UF</th>
                  <th className="px-4 py-3.5">Telefone</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                {filteredStations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-neutral-400">
                      <Store size={36} className="mx-auto text-amber-500 mb-2 opacity-60" />
                      <p className="font-bold text-neutral-800 dark:text-white">Nenhum posto credenciado cadastrado ainda</p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                        Cadastre os postos de combustíveis conveniados para facilitar a emissão ágil de ordens.
                      </p>
                      <button
                        onClick={handleOpenNewStation}
                        className="mt-4 px-4 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} /> Cadastrar Primeiro Posto
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedStations.map(station => (
                    <tr key={station.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                        {station.name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                        {station.cnpj || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                        {station.address || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300 font-medium">
                        {station.city || 'Torixoréu - MT'}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                        {station.phone || '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        {station.status === 'ativo' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 size={10} /> Credenciado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditStation(station)}
                            title="Editar Posto"
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteStation(station)}
                            title="Excluir Posto"
                            className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação de 30 itens por página */}
          {renderPagination(currentPage, totalPagesStations, filteredStations.length, setCurrentPage)}
        </div>
      )}

      {/* MODAL 1: EMISSÃO DE NOVA ORDEM DIGITAL GUIADA EM 3 PASSOS (UX FLUIDA) */}
      <AnimatePresence>
        {isNewOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto"
            >
              {/* Header do Modal */}
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Fuel size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Emissão de Ordem de Abastecimento Digital
                    </h3>
                    <p className="text-neutral-400 text-xs">Canhoto em 2 vias, QR Code validador e parâmetros travados</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsNewOrderModalOpen(false);
                    setNewOrderStep(1);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* STEPPER DE NAVEGAÇÃO RÁPIDA (UX PREMIUM) */}
              <div className="grid grid-cols-3 gap-2 my-4">
                <button
                  type="button"
                  onClick={() => setNewOrderStep(1)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    newOrderStep === 1
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                      : newOrderForm.vehicle_id
                      ? 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                      : 'opacity-50 border-transparent text-neutral-400'
                  }`}
                >
                  <span className="text-[10px] font-bold block uppercase tracking-wider text-neutral-400">Passo 1</span>
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <Car size={13} />
                    Veículo Oficial
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => newOrderForm.vehicle_id && setNewOrderStep(2)}
                  disabled={!newOrderForm.vehicle_id}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    newOrderStep === 2
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                      : newOrderForm.driver_name
                      ? 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                      : 'opacity-50 border-transparent text-neutral-400'
                  }`}
                >
                  <span className="text-[10px] font-bold block uppercase tracking-wider text-neutral-400">Passo 2</span>
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <Users size={13} />
                    Condutor & Posto
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => newOrderForm.vehicle_id && newOrderForm.driver_name && setNewOrderStep(3)}
                  disabled={!newOrderForm.vehicle_id || !newOrderForm.driver_name}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    newOrderStep === 3
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                      : 'opacity-50 border-transparent text-neutral-400'
                  }`}
                >
                  <span className="text-[10px] font-bold block uppercase tracking-wider text-neutral-400">Passo 3</span>
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <DollarSign size={13} />
                    Litragem & Trava
                  </span>
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                {/* PASSO 1: SELEÇÃO DO VEÍCULO COM BUSCA INTELIGENTE */}
                {newOrderStep === 1 && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Localizar Veículo por Placa, Modelo ou Secretaria:
                      </label>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="Ex: RNT-4E12, Ambulância, Hilux, Educação..."
                          value={vehicleSearchFilter}
                          onChange={e => setVehicleSearchFilter(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Lista com rolagem rápida de veículos */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-1.5">
                      {vehicles
                        .filter(v => {
                          const q = vehicleSearchFilter.toLowerCase().trim();
                          return !q || 
                            v.plate.toLowerCase().includes(q) || 
                            v.model.toLowerCase().includes(q) || 
                            v.department.toLowerCase().includes(q);
                        })
                        .map(v => {
                          const isSelected = newOrderForm.vehicle_id === v.id;
                          return (
                            <div
                              key={v.id}
                              onClick={() => {
                                const isEmergency = !!v.is_emergency_priority;
                                const lastOrder = orders.find(o => o.vehicle_id === v.id && o.driver_name);
                                setNewOrderForm(prev => ({
                                  ...prev,
                                  vehicle_id: v.id,
                                  fuel_type: v.fuel_type,
                                  current_odometer: v.current_odometer || 0,
                                  budget_classification_id: v.budget_classification_id || prev.budget_classification_id || '',
                                  driver_name: prev.driver_name || lastOrder?.driver_name || '',
                                  driver_document: prev.driver_document || lastOrder?.driver_document || '',
                                  is_full_tank_order: isEmergency ? true : prev.is_full_tank_order,
                                  liters_authorized: isEmergency ? v.tank_capacity : Math.min(prev.liters_authorized, v.tank_capacity),
                                  emergency_call_reason: isEmergency && !prev.emergency_call_reason ? `Plantão de Prontidão 24h - ${v.model}` : prev.emergency_call_reason
                                }));
                              }}
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-sm'
                                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <MercosulPlate plate={v.plate} size="xs" />
                                <div>
                                  <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                                    <span>{v.model}</span>
                                    {v.is_emergency_priority && (
                                      <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded uppercase">
                                        🚨 24h
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-neutral-400">
                                    {v.department} • Tanque: {v.tank_capacity}L • Combustível: {formatFuelLabel(v.fuel_type)}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isSelected ? 'bg-amber-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                                }`}>
                                  {isSelected ? '✓ Selecionado' : 'Selecionar'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Resumo do Veículo Selecionado & Entrada Manual do Odômetro Atual */}
                    {selectedVehicleForNewOrder && (
                      <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-bold uppercase">Veículo Oficial Definido:</span>
                            <span className="font-bold text-neutral-900 dark:text-white text-sm">
                              {selectedVehicleForNewOrder.plate} — {selectedVehicleForNewOrder.model}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block font-bold uppercase">Último Odômetro no Sistema:</span>
                            <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                              {formatThousands(selectedVehicleForNewOrder.current_odometer)} km
                            </span>
                          </div>
                        </div>

                        {/* Campo para Digitação Manual do KM Atual do Painel Formatado em Milhar */}
                        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                          <label className="block text-xs font-black text-amber-950 dark:text-amber-200 mb-1 flex items-center gap-1.5">
                            <Gauge size={14} className="text-amber-600" />
                            Odômetro Atual no Painel do Veículo (KM) *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={newOrderForm.current_odometer ? formatThousands(newOrderForm.current_odometer) : ''}
                              onChange={e => {
                                const num = parseThousands(e.target.value);
                                setNewOrderForm({ ...newOrderForm, current_odometer: num });
                              }}
                              placeholder={`Ex: ${formatThousands(selectedVehicleForNewOrder.current_odometer || 0)}`}
                              required
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-black font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 font-mono">
                              KM
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1 text-[11px]">
                            <span className="text-neutral-500">
                              Formatação automática com separador de milhar. Digite a leitura do painel.
                            </span>
                            {newOrderForm.current_odometer > selectedVehicleForNewOrder.current_odometer && (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                +{formatThousands(newOrderForm.current_odometer - selectedVehicleForNewOrder.current_odometer)} km rodados
                              </span>
                            )}
                          </div>
                        </div>

                        {/* SELEÇÃO DA CLASSIFICAÇÃO ORÇAMENTÁRIA (CENTRO DE CUSTO / FICHA) */}
                        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                              <Layers size={14} className="text-amber-600" />
                              Classificação Orçamentária (Centro de Custo / Ficha) *
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsBudgetClassificationsModalOpen(true)}
                              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={11} />
                              <span>Gerenciar / Crédito Especial</span>
                            </button>
                          </div>
                          <select
                            value={newOrderForm.budget_classification_id}
                            onChange={e => setNewOrderForm({ ...newOrderForm, budget_classification_id: e.target.value })}
                            required
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                          >
                            <option value="">Selecione a dotação contábil para esta autorização...</option>
                            {sortedBudgetClassifications.map(bc => (
                              <option key={bc.id} value={bc.id}>
                                {bc.invoice_sheet} • {bc.department_local} — Fonte {bc.funding_source} {bc.budget_code ? `(Cód: ${bc.budget_code})` : ''}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-neutral-500 mt-1">
                            * Esta classificação oficial sairá impressa com destaque na 1ª e 2ª vias do canhoto de abastecimento.
                          </p>
                        </div>

                        {newOrderForm.driver_name && (
                          <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                              <UserCheck size={14} />
                              <span>Condutor habitual identificado: <strong>{newOrderForm.driver_name}</strong></span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewOrderStep(2)}
                              className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                            >
                              Trocar Condutor
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsNewOrderModalOpen(false)}
                        className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!newOrderForm.vehicle_id}
                        onClick={() => setNewOrderStep(2)}
                        className="px-4 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer border border-amber-300 dark:border-amber-800"
                      >
                        <span>Passo 2: Condutor & Posto</span>
                        <ArrowRight size={13} />
                      </button>
                      {newOrderForm.vehicle_id && newOrderForm.driver_name && (
                        <button
                          type="button"
                          onClick={() => setNewOrderStep(3)}
                          className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Condutor já preenchido — ir direto para litragem e emissão"
                        >
                          <span>⚡ Ir Direto p/ Litragem & Semáforo</span>
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* PASSO 2: CONDUTOR E POSTO CREDENCIADO */}
                {newOrderStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Condutor e CPF com Auto-Preenchimento e Formatação */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <Users size={15} className="text-amber-600 dark:text-amber-400" />
                          Identificação do Condutor Oficial
                        </span>
                        {matchedDriverFromForm && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            Cadastrado ({matchedDriverFromForm.department})
                          </span>
                        )}
                      </div>

                      {/* Seletor Rápido de Motorista Cadastrado */}
                      {drivers.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                            Puxar Motorista Oficial (por Nome ou CPF):
                          </label>
                          <select
                            value={matchedDriverFromForm?.id || ''}
                            onChange={e => {
                              const drvId = e.target.value;
                              const found = drivers.find(d => d.id === drvId);
                              if (found) {
                                handleSelectDriverQuick(found);
                              }
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
                          >
                            <option value="">Selecione na lista ou digite abaixo para busca instantânea...</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>
                                {d.full_name}{d.cpf ? ` • CPF: ${formatCPF(d.cpf)}` : ''} ({d.department})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Campo Nome com Auto-Suggest */}
                        <div className="relative">
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            Nome do Motorista / Condutor *
                          </label>
                          <input
                            type="text"
                            placeholder="Digite o nome do motorista..."
                            value={newOrderForm.driver_name}
                            onChange={e => handleDriverNameChange(e.target.value)}
                            onFocus={() => setShowDriverSuggestions(true)}
                            required
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                          />

                          {/* Lista flutuante de sugestões quando digita o nome */}
                          {showDriverSuggestions && filteredDriversForStep2.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 space-y-1">
                              {filteredDriversForStep2.map(drv => (
                                <button
                                  key={drv.id}
                                  type="button"
                                  onClick={() => handleSelectDriverQuick(drv)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center justify-between text-xs cursor-pointer"
                                >
                                  <div>
                                    <span className="font-bold text-neutral-900 dark:text-white block">
                                      {drv.full_name}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                      {drv.department} {drv.cnh_category ? `• CNH ${drv.cnh_category}` : ''}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                                    {drv.cpf ? formatCPF(drv.cpf) : 'Sem CPF'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Campo CPF com Máscara e Detecção Instantânea */}
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            CPF do Condutor <span className="text-neutral-400 font-normal">(Opcional)</span>
                          </label>
                          <input
                            type="text"
                            maxLength={14}
                            placeholder="000.000.000-00 (opcional)"
                            value={newOrderForm.driver_document}
                            onChange={e => handleDriverCpfChange(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                          />
                          <span className="text-[10px] text-neutral-500 mt-0.5 block">
                            Formatação automática. Ao digitar o CPF, o motorista é identificado.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Posto Credenciado */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Posto Conveniado Credenciado (Contrato Municipal) *
                      </label>
                      {stations.length > 0 ? (
                        <select
                          value={newOrderForm.station_name}
                          onChange={e => setNewOrderForm({ ...newOrderForm, station_name: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">Selecione o posto credenciado...</option>
                          {stations.map(st => (
                            <option key={st.id} value={st.name}>
                              {st.name} {st.cnpj ? `(${st.cnpj})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Ex: Auto Posto Central Municipal Ltda"
                          value={newOrderForm.station_name}
                          onChange={e => setNewOrderForm({ ...newOrderForm, station_name: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      )}
                    </div>

                    <div className="flex justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setNewOrderStep(1)}
                        className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                      >
                        ← Voltar ao Veículo
                      </button>
                      <button
                        type="button"
                        disabled={!newOrderForm.driver_name.trim()}
                        onClick={() => setNewOrderStep(3)}
                        className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <span>Avançar: Litragem & Valores Travados</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* PASSO 3: LITRAGEM E PARÂMETROS LICITATÓRIOS TRAVADOS */}
                {newOrderStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* SELETOR DE MODALIDADE DE ABASTECIMENTO */}
                    <div className="p-3.5 bg-neutral-100/80 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                        Modalidade de Abastecimento Autorizada *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewOrderForm(prev => ({
                              ...prev,
                              supply_mode: 'litragem_fixa',
                              liters_authorized: prev.liters_authorized > (selectedVehicleForNewOrder?.tank_capacity || 100) ? 40 : (prev.liters_authorized || 40)
                            }));
                          }}
                          className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                            newOrderForm.supply_mode === 'litragem_fixa'
                              ? 'bg-white dark:bg-neutral-900 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                              : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                            <span>Litragem Fixa</span>
                            {newOrderForm.supply_mode === 'litragem_fixa' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                          </span>
                          <span className="text-[10px] text-neutral-500 leading-tight">
                            Quantidade pré-autorizada na emissão (teto máximo)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewOrderForm(prev => ({
                              ...prev,
                              supply_mode: 'encher_tanque',
                              liters_authorized: selectedVehicleForNewOrder?.tank_capacity || prev.liters_authorized
                            }));
                          }}
                          className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                            newOrderForm.supply_mode === 'encher_tanque'
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                              : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                            <span>⛽ Completar Tanque (Top-Off)</span>
                            {newOrderForm.supply_mode === 'encher_tanque' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-tight">
                            Até o desarme da bomba (teto = capacidade física {selectedVehicleForNewOrder?.tank_capacity || 0}L)
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* NÚMERO DA ORDEM (PADRÃO OFICIAL 7 DÍGITOS) */}
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <FileText size={13} className="text-amber-600 dark:text-amber-400" />
                          Número da Ordem (Padrão Oficial 7 Dígitos)
                        </label>
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                          Sequencial automático sugerido
                        </span>
                      </div>
                      <input
                        type="text"
                        value={newOrderForm.custom_order_number}
                        onChange={e => setNewOrderForm({ ...newOrderForm, custom_order_number: e.target.value.toUpperCase() })}
                        onBlur={e => {
                          if (e.target.value.trim()) {
                            setNewOrderForm(prev => ({ ...prev, custom_order_number: formatOrderNumber7Digits(e.target.value) }));
                          }
                        }}
                        placeholder="Ex: 0022464"
                        className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* DADOS DO RESPONSÁVEL PELA AUTORIZAÇÃO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Responsável pela Autorização (Gestor Emissor) *
                        </label>
                        <input
                          type="text"
                          required
                          value={newOrderForm.authorized_by_name}
                          onChange={e => setNewOrderForm({ ...newOrderForm, authorized_by_name: e.target.value })}
                          placeholder="Nome do Secretário / Gestor"
                          className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Cargo / Matrícula Oficial *
                        </label>
                        <input
                          type="text"
                          required
                          value={newOrderForm.authorized_by_role}
                          onChange={e => setNewOrderForm({ ...newOrderForm, authorized_by_role: e.target.value })}
                          placeholder="Ex: Secretário Municipal de Frotas / Matr. 1024"
                          className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    {/* Litros Autorizados & Atalhos */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Quantidade de Combustível Autorizada (Litros) *
                        </label>
                        {selectedVehicleForNewOrder && (
                          <span className="text-[11px] font-bold text-neutral-500">
                            Tanque Físico: <strong>{selectedVehicleForNewOrder.tank_capacity} L</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          value={newOrderForm.liters_authorized}
                          onChange={e => setNewOrderForm({ ...newOrderForm, liters_authorized: parseFloat(e.target.value) || 0 })}
                          required
                          className={`w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border rounded-xl text-sm font-mono font-black focus:outline-none focus:ring-2 ${
                            isLitersOverCapacity 
                              ? 'border-rose-500 text-rose-600 focus:ring-rose-500 bg-rose-50/30' 
                              : 'border-neutral-200 dark:border-neutral-700 focus:ring-emerald-500 text-neutral-900 dark:text-white'
                          }`}
                        />
                      </div>

                      {newOrderForm.supply_mode === 'encher_tanque' && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-start gap-2 text-emerald-800 dark:text-emerald-200 text-xs">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Modo Completar Tanque Homologado:</strong> O motorista está autorizado a abastecer até o desarme automático da bomba do posto. O valor final e a litragem real serão liquidados pelo fiscal após o lançamento do comprovante.
                          </div>
                        </div>
                      )}

                      {/* Botões de Atalho de Litros */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setNewOrderForm({ ...newOrderForm, liters_authorized: 20 })}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                        >
                          20L
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewOrderForm({ ...newOrderForm, liters_authorized: 40 })}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                        >
                          40L
                        </button>
                        {selectedVehicleForNewOrder && (
                          <button
                            type="button"
                            onClick={() => setNewOrderForm({ ...newOrderForm, liters_authorized: selectedVehicleForNewOrder.tank_capacity })}
                            className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            Tanque Cheio ({selectedVehicleForNewOrder.tank_capacity}L)
                          </button>
                        )}
                      </div>

                      {/* ALERTA VISUAL DE TRAVA DE TANQUE */}
                      {isLitersOverCapacity && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs">
                          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>BLOQUEIO ANTIFRAUDE DO TCE:</strong> A litragem autorizada ({newOrderForm.liters_authorized}L) excede a capacidade física do tanque do veículo ({selectedVehicleForNewOrder?.tank_capacity}L). Reduza a quantidade.
                          </div>
                        </div>
                      )}
                    </div>

                                        {/* Classificação Orçamentária Confirmada para o Canhoto */}
                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 text-xs flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-bold uppercase">
                          Classificação Orçamentária Gravada no Canhoto:
                        </span>
                        <span className="font-bold text-neutral-900 dark:text-white text-xs">
                          {(() => {
                            const bc = budgetClassifications.find(b => b.id === newOrderForm.budget_classification_id || b.invoice_sheet === newOrderForm.budget_classification_id) || 
                              resolveOrderBudget(null, selectedVehicleForNewOrder, budgetClassifications);
                            if (!bc) return 'Selecione a Ficha Orçamentária no Passo 1';
                            return `${bc.invoice_sheet} • ${bc.department_local} — Fonte ${bc.funding_source} ${bc.budget_code ? `(Cód: ${bc.budget_code})` : ''}`;
                          })()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewOrderStep(1)}
                        className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Alterar Ficha
                      </button>
                    </div>

                    {/* Odômetro Atual Confirmado */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-bold uppercase">Odômetro do Painel Gravado:</span>
                        <span className="font-mono font-black text-sm text-neutral-900 dark:text-white">
                          {formatThousands(newOrderForm.current_odometer || selectedVehicleForNewOrder?.current_odometer || 0)} km
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewOrderStep(1)}
                        className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                      >
                        Ajustar KM
                      </button>
                    </div>

                    {/* QUADRO FINANCEIRO E VOLUMÉTRICO TRAVADO (SEM CAMPOS EM BRANCO) */}
                    <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                          Parâmetros Licitatórios Homologados • 100% Travados
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPriceEditForm(biddedPrices);
                            setIsPriceConfigModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Sliders size={11} />
                          Reequilíbrio / Ajustar Tabela
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                          <span className="text-[9px] text-neutral-500 block font-bold uppercase">Combustível</span>
                          <span className="text-xs font-black text-blue-700 dark:text-blue-300 block truncate">
                            {selectedVehicleForNewOrder ? formatFuelLabel(selectedVehicleForNewOrder.fuel_type) : '-'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                          <span className="text-[9px] text-neutral-500 block font-bold uppercase">Preço Licitado</span>
                          <span className="text-xs font-black font-mono text-neutral-900 dark:text-white block">
                            R$ {currentBiddedPrice.toFixed(3)}/L
                          </span>
                        </div>
                        {newOrderForm.supply_mode === 'encher_tanque' ? (
                          <div className="bg-emerald-700 text-white p-2.5 rounded-xl shadow-sm">
                            <span className="text-[9px] text-emerald-100 block font-bold uppercase">Valor da Ordem</span>
                            <span className="text-xs font-black block mt-0.5">
                              A Apurar na Bomba
                            </span>
                            <span className="text-[8px] text-emerald-200 block leading-tight">
                              (Regime Top-Off)
                            </span>
                          </div>
                        ) : (
                          <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-sm">
                            <span className="text-[9px] text-emerald-100 block font-bold uppercase">Total Travado</span>
                            <span className="text-sm font-black font-mono block">
                              R$ {currentTotalAuthorized.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 text-center font-medium leading-tight">
                        {newOrderForm.supply_mode === 'encher_tanque'
                          ? '* No regime Top-Off, o valor final não é fixado na emissão e será calculado após o abastecimento conforme os litros reais fornecidos.'
                          : '* A ordem já sai 100% preenchida na emissão. O frentista e motorista assinam o canhoto e conferem apenas o odômetro.'}
                      </div>
                    </div>

                    {/* 🚦 SEMÁFORO DE AUDITORIA PRÉVIA DA ORDEM (CONTROLE INTERNO TCE) */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      emissionSemaphore.level === 'critico'
                        ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                        : emissionSemaphore.level === 'alerta'
                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                        : 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    }`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🚦</span>
                          <div>
                            <h5 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
                              Semáforo de Auditoria Prévia
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                Padrão TCE
                              </span>
                            </h5>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                              Validação em tempo real dos parâmetros fiscais e físicos antes da emissão
                            </p>
                          </div>
                        </div>

                        {/* Badge do Semáforo Consolidado */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide shadow-xs ${emissionSemaphore.badgeColor}`}>
                          {emissionSemaphore.level === 'critico' ? (
                            <AlertTriangle size={11} />
                          ) : emissionSemaphore.level === 'alerta' ? (
                            <AlertCircle size={11} />
                          ) : (
                            <ShieldCheck size={12} />
                          )}
                          {emissionSemaphore.level === 'critico' ? '🔴 ' : emissionSemaphore.level === 'alerta' ? '🟡 ' : '🟢 '}
                          {emissionSemaphore.label}
                        </span>
                      </div>

                      {/* Motivo do Bloqueio ou Alerta */}
                      {emissionSemaphore.level !== 'conforme' && (
                        <div className={`p-2 rounded-xl mb-2.5 text-xs font-bold flex items-start gap-1.5 ${
                          emissionSemaphore.level === 'critico'
                            ? 'bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                        }`}>
                          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                          <span>{emissionSemaphore.reason}</span>
                        </div>
                      )}

                      {/* Grid dos 3 Pilares de Auditoria */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {/* Pilar 1: Trava Física de Tanque */}
                        <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                          isLitersOverCapacity
                            ? 'bg-rose-100/90 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
                            : 'bg-white/90 dark:bg-neutral-900/70 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'
                        }`}>
                          <span className="text-sm mt-0.5">{isLitersOverCapacity ? '🔴' : '🟢'}</span>
                          <div className="min-w-0 flex-1">
                            <strong className="text-[11px] block font-black uppercase tracking-tight">Trava de Tanque</strong>
                            <span className="text-[10px] opacity-85 block leading-tight">
                              {isLitersOverCapacity
                                ? `Excede capacidade (${selectedVehicleForNewOrder?.tank_capacity}L)`
                                : newOrderForm.supply_mode === 'encher_tanque'
                                ? `Top-Off liberado (teto ${selectedVehicleForNewOrder?.tank_capacity}L)`
                                : `${newOrderForm.liters_authorized}L ≤ ${selectedVehicleForNewOrder?.tank_capacity}L (Trava OK)`}
                            </span>
                          </div>
                        </div>

                        {/* Pilar 2: Coerência do Odômetro */}
                        <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                          isOdometerInvalid
                            ? 'bg-rose-100/90 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
                            : 'bg-white/90 dark:bg-neutral-900/70 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'
                        }`}>
                          <span className="text-sm mt-0.5">{isOdometerInvalid ? '🔴' : '🟢'}</span>
                          <div className="min-w-0 flex-1">
                            <strong className="text-[11px] block font-black uppercase tracking-tight">Odômetro do Painel</strong>
                            <span className="text-[10px] opacity-85 block leading-tight">
                              {isOdometerInvalid
                                ? `KM menor que o anterior (${formatThousands(selectedVehicleForNewOrder?.current_odometer || 0)})`
                                : `${formatThousands(newOrderForm.current_odometer || selectedVehicleForNewOrder?.current_odometer || 0)} km (Coerente)`}
                            </span>
                          </div>
                        </div>

                        {/* Pilar 3: Dotação Orçamentária */}
                        <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                          !selectedVehicleForNewOrder?.budget_classification_id && !newOrderForm.budget_classification_id
                            ? 'bg-amber-100/90 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
                            : 'bg-white/90 dark:bg-neutral-900/70 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'
                        }`}>
                          <span className="text-sm mt-0.5">
                            {!selectedVehicleForNewOrder?.budget_classification_id && !newOrderForm.budget_classification_id ? '🟡' : '🟢'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <strong className="text-[11px] block font-black uppercase tracking-tight">Dotação / Ficha</strong>
                            <span className="text-[10px] opacity-85 block leading-tight truncate">
                              {(() => {
                                const bc = budgetClassifications.find(b => b.id === newOrderForm.budget_classification_id || b.invoice_sheet === newOrderForm.budget_classification_id) || 
                                  resolveOrderBudget(null, selectedVehicleForNewOrder, budgetClassifications);
                                return bc ? `Ficha ${bc.invoice_sheet} (${bc.funding_source})` : 'Pendente de seleção';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botões do Rodapé */}
                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setNewOrderStep(2)}
                        className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                      >
                        ← Voltar
                      </button>

                      <button
                        type="submit"
                        disabled={!emissionSemaphore.canEmit || !newOrderForm.vehicle_id || !newOrderForm.driver_name}
                        className={`px-5 py-2.5 text-xs font-black text-white rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                          !emissionSemaphore.canEmit 
                            ? 'bg-neutral-400 cursor-not-allowed opacity-60' 
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <Printer size={16} />
                        <span>Emitir Ordem & Imprimir Canhoto em 2 Vias (A4)</span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: LANÇAMENTO DE CANHOTO E COMPROVANTES (EXECUÇÃO) */}
      <AnimatePresence>
        {isExecutionModalOpen && selectedOrderForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="font-mono font-bold text-xs text-amber-600">{selectedOrderForAction.order_number}</span>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    {selectedOrderForAction.status === 'abastecido'
                      ? 'Correção de Dados de Abastecimento'
                      : 'Lançamento de Canhoto & Baixa de Abastecimento'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsExecutionModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveExecution} className="mt-4 space-y-4">
                {/* Número da Autorização / Talão Físico (Editável) */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <FileText size={14} className="text-emerald-500" />
                      Número da Autorização / Talão em Papel
                    </label>
                    <span className="text-[10px] text-neutral-400">Pode alterar para seguir o talão físico</span>
                  </div>
                  <input
                    type="text"
                    value={executionForm.custom_order_number}
                    onChange={e => setExecutionForm({ ...executionForm, custom_order_number: e.target.value.toUpperCase() })}
                    onBlur={e => {
                      if (e.target.value.trim()) {
                        setExecutionForm(prev => ({ ...prev, custom_order_number: formatOrderNumber7Digits(e.target.value) }));
                      }
                    }}
                    placeholder={selectedOrderForAction.order_number}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Ficha Orçamentária / Dotação de Despesa (Editável) */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Layers size={14} className="text-amber-500" />
                      Ficha Orçamentária / Dotação de Despesa
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsBudgetClassificationsModalOpen(true)}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      + Gerenciar Fichas
                    </button>
                  </div>
                  <select
                    value={executionForm.budget_classification_id}
                    onChange={e => setExecutionForm({ ...executionForm, budget_classification_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Usar Dotação Padrão do Veículo / Secretaria --</option>
                    {sortedBudgetClassifications.map(bc => (
                      <option key={bc.id} value={bc.id}>
                        {bc.invoice_sheet} • {bc.department_local} — Fonte {bc.funding_source} {bc.budget_code ? `(Cód: ${bc.budget_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Litros e Odômetro */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Litros Fornecidos *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={executionForm.liters_supplied}
                      onChange={e => setExecutionForm({ ...executionForm, liters_supplied: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-neutral-400">Autorizado: {selectedOrderForAction.liters_authorized} L</span>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-800/80 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <span className="block text-[10px] font-bold text-neutral-500 uppercase">
                      Preço Unitário Homologado
                    </span>
                    <span className="text-sm font-black text-emerald-600 block mt-0.5">
                      R$ {Number(selectedOrderForAction.bidded_unit_price || executionForm.unit_price || 6.19).toFixed(3)}/L
                    </span>
                    <span className="text-[10px] text-neutral-500 font-semibold block">
                      Total Previsto: R$ {((executionForm.liters_supplied || selectedOrderForAction.liters_authorized) * Number(selectedOrderForAction.bidded_unit_price || executionForm.unit_price || 6.19)).toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Odômetro Atual no Painel (KM) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={executionForm.current_odometer ? formatThousands(executionForm.current_odometer) : ''}
                      onChange={e => setExecutionForm({ ...executionForm, current_odometer: parseThousands(e.target.value) })}
                      required
                      className={`w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 ${
                        (!selectedOrderForAction.previous_odometer || selectedOrderForAction.previous_odometer <= 0)
                          ? (executionForm.current_odometer <= 0 ? 'border-rose-500 text-rose-600 focus:ring-rose-500' : 'border-neutral-200 dark:border-neutral-700 focus:ring-emerald-500')
                          : (executionForm.current_odometer <= selectedOrderForAction.previous_odometer ? 'border-rose-500 text-rose-600 focus:ring-rose-500' : 'border-neutral-200 dark:border-neutral-700 focus:ring-emerald-500')
                      }`}
                    />
                    <span className="text-[10px] text-neutral-400">
                      {!selectedOrderForAction.previous_odometer || selectedOrderForAction.previous_odometer <= 0
                        ? '1º Abastecimento (Definição de KM Base)'
                        : `Anterior: ${formatThousands(selectedOrderForAction.previous_odometer)} km`}
                    </span>
                  </div>
                </div>

                {/* PAINEL MATEMÁTICO DE AUDITORIA EM TEMPO REAL (ANTIFRAUDE) */}
                {(() => {
                  const v = selectedOrderForAction.vehicle || vehicles.find(item => item.id === selectedOrderForAction.vehicle_id);
                  const isFirstRecord = !selectedOrderForAction.previous_odometer || selectedOrderForAction.previous_odometer <= 0;
                  const deltaOdo = (!isFirstRecord && executionForm.current_odometer > selectedOrderForAction.previous_odometer)
                    ? executionForm.current_odometer - selectedOrderForAction.previous_odometer
                    : 0;
                  const expectedLiters = (v && v.expected_consumption > 0 && deltaOdo > 0)
                    ? (deltaOdo / v.expected_consumption)
                    : 0;
                  const maxAllowed = expectedLiters * 1.30;
                  const isEmergencyOrFullTank = selectedOrderForAction.is_full_tank_order || v?.is_emergency_priority;
                  const excessLiters = executionForm.liters_supplied - maxAllowed;
                  const isExcess = !isFirstRecord && isEmergencyOrFullTank && deltaOdo > 0 && expectedLiters > 0 && executionForm.liters_supplied > maxAllowed && excessLiters > 8.0;
                  const isStagnant = !isFirstRecord && deltaOdo < 15 && executionForm.liters_supplied > 10;

                  return (
                    <div className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
                      isExcess || isStagnant
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        : isEmergencyOrFullTank
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      <div className="flex justify-between items-center font-bold">
                        <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                          <Gauge size={13} />
                          Auditoria Cruzada (Odômetro x Litragem Faturada)
                        </span>
                        {isEmergencyOrFullTank && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white">
                            🚨 Prontidão 24h
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                        <div>
                          <span className="text-[10px] opacity-70 block">Deslocamento:</span>
                          <strong className="text-xs font-mono">+{formatThousands(deltaOdo)} km</strong>
                        </div>
                        <div>
                          <span className="text-[10px] opacity-70 block">Consumo Teórico:</span>
                          <strong className="text-xs font-mono">~{expectedLiters.toFixed(1)} L</strong>
                        </div>
                        <div>
                          <span className="text-[10px] opacity-70 block">Teto com Margem (30%):</span>
                          <strong className="text-xs font-mono">{maxAllowed.toFixed(1)} L</strong>
                        </div>
                        <div>
                          <span className="text-[10px] opacity-70 block">Faturado no Canhoto:</span>
                          <strong className={`text-xs font-mono ${isExcess ? 'text-rose-600 dark:text-rose-400 font-black' : ''}`}>
                            {executionForm.liters_supplied.toFixed(1)} L
                          </strong>
                        </div>
                      </div>

                      {isExcess && (
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-start gap-2 text-rose-900 dark:text-rose-100 text-[11px] font-bold">
                          <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                          <span>
                            ALERTA ANTIFRAUDE: O abastecimento excede em {(executionForm.liters_supplied - expectedLiters).toFixed(1)}L o consumo físico estimado para a quilometragem percorrida. O sistema registrará anomalia automática para auditoria do TCE.
                          </span>
                        </div>
                      )}

                      {isStagnant && !isExcess && (
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-start gap-2 text-amber-900 dark:text-amber-100 text-[11px] font-bold">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            ALERTA DE ODÔMETRO ESTAGNADO: Abastecimento de alto volume para apenas {deltaOdo} km rodados. Requer comprovação de funcionamento em marcha lenta ou manutenção técnica.
                          </span>
                        </div>
                      )}

                      {!isExcess && !isStagnant && deltaOdo > 0 && (
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle2 size={13} />
                          <span>Abastecimento matematicamente compatível com a quilometragem percorrida.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* SEÇÃO DE UPLOAD DAS FOTOS DO ABASTECIMENTO (SEM NECESSIDADE DE ANEXAR NOTA FISCAL) */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Camera size={14} className="text-emerald-600" />
                      Fotos Comprobatórias do Abastecimento (Visor da Bomba e Painel/Odômetro)
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-semibold">
                      Sem exigência de NF-e
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Anexo 1: Foto do Visor da Bomba */}
                    <div className="border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-center flex flex-col justify-between hover:border-emerald-500/50 transition-all">
                      <div>
                        <span className="block text-[11px] font-black text-neutral-800 dark:text-neutral-200 mb-2 truncate">
                          1. Visor da Bomba *
                        </span>
                        {executionForm.pump_photo_url ? (
                          <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 group">
                            <img
                              src={executionForm.pump_photo_url}
                              alt="Visor da Bomba"
                              className="w-full h-24 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              Trocar Foto
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center p-2 text-neutral-400 bg-white dark:bg-neutral-900/50">
                            <Fuel size={22} className="text-neutral-400 mb-1" />
                            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300">Litros e Valor (R$)</span>
                            <span className="text-[9px] text-neutral-400">Visor digital da bomba</span>
                          </div>
                        )}
                      </div>

                      <label className="mt-2.5 block cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) handleFileUpload(selectedOrderForAction.id, file, 'pump');
                          }}
                          className="sr-only"
                        />
                        <span className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-[11px] font-bold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition-colors shadow-sm">
                          <Upload size={12} />
                          {executionForm.pump_photo_url ? 'Substituir Foto' : 'Selecionar Foto'}
                        </span>
                      </label>
                    </div>

                    {/* Anexo 2: Foto do Painel / Odômetro */}
                    <div className="border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-center flex flex-col justify-between hover:border-emerald-500/50 transition-all">
                      <div>
                        <span className="block text-[11px] font-black text-neutral-800 dark:text-neutral-200 mb-2 truncate">
                          2. Painel / Odômetro *
                        </span>
                        {executionForm.odometer_photo_url ? (
                          <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 group">
                            <img
                              src={executionForm.odometer_photo_url}
                              alt="Painel do Veículo"
                              className="w-full h-24 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              Trocar Foto
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center p-2 text-neutral-400 bg-white dark:bg-neutral-900/50">
                            <Gauge size={22} className="text-neutral-400 mb-1" />
                            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300">KM no Painel</span>
                            <span className="text-[9px] text-neutral-400">Foto no ato do posto</span>
                          </div>
                        )}
                      </div>

                      <label className="mt-2.5 block cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) handleFileUpload(selectedOrderForAction.id, file, 'odometer');
                          }}
                          className="sr-only"
                        />
                        <span className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-[11px] font-bold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition-colors shadow-sm">
                          <Upload size={12} />
                          {executionForm.odometer_photo_url ? 'Substituir Foto' : 'Selecionar Foto'}
                        </span>
                      </label>
                    </div>

                    {/* Anexo 3: Canhoto Físico Assinado (Opcional) */}
                    <div className="border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-center flex flex-col justify-between hover:border-emerald-500/50 transition-all">
                      <div>
                        <span className="block text-[11px] font-black text-neutral-800 dark:text-neutral-200 mb-2 truncate">
                          3. Canhoto Assinado (Opcional)
                        </span>
                        {executionForm.receipt_attachment_url ? (
                          <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 group">
                            <img
                              src={executionForm.receipt_attachment_url}
                              alt="Canhoto Assinado"
                              className="w-full h-24 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              Trocar Canhoto
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center p-2 text-neutral-400 bg-white dark:bg-neutral-900/50">
                            <FileCheck size={22} className="text-neutral-400 mb-1" />
                            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300">Canhoto 2 Vias</span>
                            <span className="text-[9px] text-neutral-400">Opcional se via QR Code</span>
                          </div>
                        )}
                      </div>

                      <label className="mt-2.5 block cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) handleFileUpload(selectedOrderForAction.id, file, 'receipt');
                          }}
                          className="sr-only"
                        />
                        <span className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-[11px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-300 dark:border-neutral-700">
                          <Upload size={12} />
                          {executionForm.receipt_attachment_url ? 'Substituir Canhoto' : 'Selecionar Canhoto'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Botões do Rodapé */}
                <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsExecutionModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare size={14} />
                    {selectedOrderForAction.status === 'abastecido'
                      ? 'Salvar Correções do Abastecimento'
                      : 'Validar & Finalizar Abastecimento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: JANELA POPUP COMPLETA DA ORDEM (INSPEÇÃO, HOMOLOGAÇÃO EM 1 CLIQUE & GESTÃO) */}
      <AnimatePresence>
        {isAuditModalOpen && selectedOrderForAction && (() => {
          const ord = selectedOrderForAction;
          const v = ord.vehicle || vehicles.find(item => item.id === ord.vehicle_id);
          const activeBc = resolveOrderBudget(ord, v, budgetClassifications);
          const { unitPrice, effectiveLiters, effectiveValue, formattedValue, formattedUnitPrice } = resolveOrderFinancials(ord, biddedPrices);

          const isFirstRecord = !ord.previous_odometer || ord.previous_odometer <= 0;
          const deltaKm = (!isFirstRecord && ord.current_odometer && ord.previous_odometer && ord.current_odometer > ord.previous_odometer)
            ? ord.current_odometer - ord.previous_odometer
            : 0;

          const rawConsumption = Number(ord.calculated_consumption ?? ord.calculated_km_per_liter ?? 0);
          const isValidConsumption = !isFirstRecord && deltaKm > 0 && !isNaN(rawConsumption) && rawConsumption > 0 && rawConsumption <= 50;
          const hasAnyPhoto = Boolean(ord.receipt_photo_url || ord.receipt_attachment_url || ord.odometer_photo_url || ord.pump_photo_url);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto space-y-5"
              >
                {/* Cabeçalho da Janela da Ordem */}
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      ord.status === 'glosado' || ord.is_anomaly
                        ? 'bg-rose-500/10 text-rose-600'
                        : ord.status === 'auditado'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {ord.status === 'glosado' ? <Ban size={24} /> : <ShieldCheck size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-lg text-neutral-900 dark:text-white">
                          {ord.order_number}
                        </span>
                        {ord.status === 'auditado' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            🟢 Homologada TCE
                          </span>
                        ) : ord.status === 'glosado' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white">
                            🔴 Glosada / Bloqueada
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            ⛽ Aguardando Homologação
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-400 text-xs mt-0.5">
                        Emitida em {new Date(ord.created_at).toLocaleString('pt-BR')} • {ord.station_name || 'Posto Credenciado'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAuditModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Resumo do Veículo, Condutor e Dotação */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <MercosulPlate plate={v?.plate} size="sm" />
                    <div>
                      <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                        {v?.model || 'Veículo Municipal'}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        {v?.department || 'Secretaria Municipal'} • Condutor: <strong className="text-neutral-700 dark:text-neutral-200">{ord.driver_name}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuditModalOpen(false);
                      handleOpenBudgetModal(ord);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100/80 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Layers size={13} />
                    <span>{activeBc?.invoice_sheet ? `Ficha ${activeBc.invoice_sheet}` : 'Definir Ficha'}</span>
                  </button>
                </div>

                {/* 4 Cards de Conferência Rápida (Combustível, Valor, KM e Rendimento) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-800">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Combustível</span>
                    <span className="text-sm font-black font-mono text-neutral-900 dark:text-white mt-0.5 block">
                      {effectiveLiters.toFixed(2)} L
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">
                      {ord.fuel_type.replace('_', ' ')} (Tanque {v?.tank_capacity || 0}L)
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-800">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Valor Total</span>
                    <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                      {formattedValue}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {formattedUnitPrice} / litro
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-800">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Odômetro (KM)</span>
                    <span className="text-sm font-black font-mono text-neutral-900 dark:text-white mt-0.5 block">
                      {ord.current_odometer ? formatThousands(ord.current_odometer) : '-'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      {deltaKm > 0 
                        ? `+${formatThousands(deltaKm)} km rodados` 
                        : isFirstRecord 
                        ? 'Odômetro base inicial' 
                        : `Ant: ${formatThousands(ord.previous_odometer || 0)}`}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-800">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Rendimento</span>
                    <span className="text-sm font-black font-mono text-neutral-900 dark:text-white mt-0.5 block">
                      {isValidConsumption 
                        ? `${rawConsumption.toFixed(1)} km/l` 
                        : isFirstRecord 
                        ? 'Odômetro Base' 
                        : 'Apurando'}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {isFirstRecord ? '1º registro do veículo' : `Meta: ${v?.target_consumption || 8.5} km/l`}
                    </span>
                  </div>
                </div>

                {/* Alerta do Semáforo TCE (se houver inconsistência) */}
                {(ord.is_anomaly || ord.anomaly_level === 'bloqueio_critico' || ord.anomaly_level === 'alerta_amarelo') ? (
                  <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    ord.anomaly_level === 'alerta_amarelo'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}>
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-black block">Apontamento Automático do Semáforo TCE:</strong>
                      <p className="mt-0.5">{ord.anomaly_reason}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <strong className="font-black">Semáforo TCE 100% Conforme:</strong> Litragem compatível com o tanque e odômetro validado sem divergências.
                    </div>
                  </div>
                )}

                {/* Área Principal de Homologação Rápida ou Reabertura */}
                {ord.status === 'abastecido' && !showGlossReasonBox && (
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div>
                        <h5 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase">
                          Pronta para Homologação
                        </h5>
                        <p className="text-[11px] text-neutral-500">
                          Aprove com 1 clique para liberar para liquidação ou glose se houver irregularidade.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setAuditForm({
                              status: 'glosado',
                              justification: ord.anomaly_reason || ''
                            });
                            setShowGlossReasonBox(true);
                          }}
                          className="px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 hover:bg-rose-200 dark:bg-rose-950/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Ban size={14} />
                          <span>Glosar / Bloquear</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInstantHomologate(ord)}
                          className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <ShieldCheck size={16} />
                          <span>Homologar Ordem Agora</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Caixa de Justificativa caso o usuário clique em Glosar */}
                {showGlossReasonBox && (
                  <form onSubmit={handleSaveAudit} className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                        <Ban size={14} /> Motivo da Glosa / Bloqueio do Pagamento *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowGlossReasonBox(false)}
                        className="text-[11px] font-bold text-neutral-500 hover:underline cursor-pointer"
                      >
                        Cancelar Glosa
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={auditForm.justification}
                      onChange={e => setAuditForm({ status: 'glosado', justification: e.target.value })}
                      required
                      placeholder="Descreva o motivo técnico para bloquear/glosar esta ordem..."
                      className="w-full p-3 bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-700 rounded-xl text-xs font-medium focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
                      >
                        Confirmar Glosa da Ordem
                      </button>
                    </div>
                  </form>
                )}

                {/* Caso já esteja Homologada ou Glosada: Botão Direto de Cancelar Homologação */}
                {(ord.status === 'auditado' || ord.status === 'glosado') && (
                  <div className="p-4 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-neutral-900 dark:text-white block">
                        Precisa corrigir algum dado desta ordem?
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Cancele a homologação com 1 clique para reabrir ou ir direto para a edição.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInstantCancelHomologation(ord, false)}
                        className="px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw size={13} />
                        <span>Cancelar Homologação</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInstantCancelHomologation(ord, true)}
                        className="px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit2 size={13} />
                        <span>Reabrir & Editar Agora</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Barra de Ferramentas da Ordem (Todas as Ações Reunidas na Janela) */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuditModalOpen(false);
                        handleOpenExecution(ord);
                      }}
                      className="px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 hover:bg-amber-200 dark:bg-amber-950/60 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 size={13} />
                      <span>Editar KM / Litros / Talão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => imprimirCanhotoDuasVias(ord as any, v)}
                      className="px-3 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer size={13} />
                      <span>Imprimir 2 Vias (A4)</span>
                    </button>

                    {hasAnyPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAuditModalOpen(false);
                          openAttachmentViewer(ord);
                        }}
                        className="px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Camera size={13} />
                        <span>Ver Fotos Anexadas</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAuditModalOpen(false);
                      handleDeleteOrder(ord);
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span>Excluir Ordem</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* JANELA POPUP: OPÇÕES, TABELAS & FERRAMENTAS DE GESTÃO */}
      <AnimatePresence>
        {isToolsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-xl w-full p-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Opções & Ferramentas da Frota
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Tabelas contratuais, dotações orçamentárias, canhotos antigos e relatórios TCE
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsToolsModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsModalOpen(false);
                    setPriceEditForm(biddedPrices);
                    setIsPriceConfigModalOpen(true);
                  }}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-amber-400 dark:hover:border-amber-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
                >
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-neutral-900 dark:text-white">Preços Licitados</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Tabela de preços por litro e reequilíbrio contratual
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsToolsModalOpen(false);
                    setIsBudgetClassificationsModalOpen(true);
                  }}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
                >
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-neutral-900 dark:text-white">Fichas Orçamentárias</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Centros de custo, fontes de recurso e dotações
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsToolsModalOpen(false);
                    setIsLegacyVoucherModalOpen(true);
                  }}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-amber-400 dark:hover:border-amber-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
                >
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-neutral-900 dark:text-white">Lançar Canhoto Antigo</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Registrar ou importar talões de papel retroativos
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsToolsModalOpen(false);
                    handleExportExcel();
                  }}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 dark:hover:border-emerald-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-neutral-900 dark:text-white">Exportar TCE (Excel)</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Baixar planilha auditada para prestação de contas
                    </p>
                  </div>
                </button>
              </div>

              {orders.length > 0 && (
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsModalOpen(false);
                      handleClearAllOrders();
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>Limpar Ordens de Teste</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsToolsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: CADASTRO DE NOVO VEÍCULO */}
      <AnimatePresence>
        {isNewVehicleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Cadastrar Veículo ou Máquina
                    </h3>
                    <p className="text-neutral-400 text-xs">Parâmetros técnicos para trava de tanque e consumo</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewVehicleModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateVehicle} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Placa Oficial (Mercosul) *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: BRA-2E19"
                      value={newVehicleForm.plate}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, plate: e.target.value.toUpperCase() })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Prefixo do Veículo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: AMB-04 ou RETRO-02"
                      value={newVehicleForm.prefix_code}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, prefix_code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Modelo / Fabricante *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mercedes-Benz Sprinter 416 (Ambulância SAMU)"
                    value={newVehicleForm.model}
                    onChange={e => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Secretaria / Lotação *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDepartmentsModalOpen(true)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        + Gerenciar
                      </button>
                    </div>
                    <select
                      value={newVehicleForm.department}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, department: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Selecione a secretaria...</option>
                      {newVehicleForm.department && !departments.includes(newVehicleForm.department) && (
                        <option value={newVehicleForm.department}>{newVehicleForm.department} (Legado)</option>
                      )}
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Combustível Homologado
                    </label>
                    <select
                      value={newVehicleForm.fuel_type}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, fuel_type: e.target.value as FuelType })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="diesel_s10">Diesel S-10</option>
                      <option value="diesel_s500">Diesel S-500</option>
                      <option value="gasolina">Gasolina Comum</option>
                      <option value="etanol">Etanol Hidratado</option>
                      <option value="arla32">Arla 32</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Capacidade Tanque (L) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={newVehicleForm.tank_capacity}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, tank_capacity: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Métrica de Medição
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Odômetro (KM)"
                      className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Consumo Ref. *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newVehicleForm.expected_consumption}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, expected_consumption: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Classificação Orçamentária (Centro de Custo / Ficha) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsBudgetClassificationsModalOpen(true)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Gerenciar Fichas
                    </button>
                  </div>
                  <select
                    value={newVehicleForm.budget_classification_id}
                    onChange={e => setNewVehicleForm({ ...newVehicleForm, budget_classification_id: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Selecione a dotação contábil padrão...</option>
                    {sortedBudgetClassifications.map(bc => (
                      <option key={bc.id} value={bc.id}>
                        {bc.invoice_sheet} • {bc.department_local} — Fonte {bc.funding_source} {bc.budget_code ? `(Cód: ${bc.budget_code})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Vincula os empenhos e autorizações de combustível à ficha e fonte contábil oficial
                  </p>
                </div>

                {/* MODALIDADE PREFERENCIAL: ENCHER O TANQUE (TOP-OFF) */}
                <div className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newVehicleForm.always_full_tank}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, always_full_tank: e.target.checked })}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        ⛽ Regime Obrigatório de Tanque Cheio (Top-Off Contínuo)
                      </span>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-tight">
                        Autoriza automaticamente o veículo a completar o tanque até o desarme da bomba em todas as ordens.
                      </p>
                    </div>
                  </label>
                </div>

                {/* PRIORIDADE DE PRONTIDÃO 24H (AMBULÂNCIA / ÔNIBUS) */}
                <div className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newVehicleForm.is_emergency_priority}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, is_emergency_priority: e.target.checked })}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                        🚨 Veículo de Prontidão 24h / Urgência (Ambulância, Resgate ou Transporte Escolar)
                      </span>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 leading-tight">
                        Habilita a emissão automática em regime de Tanque Cheio com rastreamento antifraude por KM rodada.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsNewVehicleModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Salvar Veículo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: VISUALIZADOR DE COMPROVANTES (FOTOS / CANHOTOS) */}
      <AnimatePresence>
        {viewingAttachmentOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="font-mono font-bold text-xs text-amber-600">{viewingAttachmentOrder.order_number}</span>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    Comprovantes Físicos Anexados à Ordem de Fornecimento
                  </h3>
                </div>
                <button
                  onClick={() => setViewingAttachmentOrder(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

{/* VISUALIZADOR SIDE-BY-SIDE (AUDITORIA MATEMÁTICA X COMPROVANTES REAIS) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
                
                {/* COLUNA ESQUERDA: DADOS DECLARADOS E AUDITORIA MATEMÁTICA */}
                <div className="lg:col-span-5 space-y-4 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                    <span className="font-black text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                      Conferência de Auditoria
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {viewingAttachmentOrder.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-neutral-400 block text-[10px] font-bold uppercase mb-1">Veículo / Placa Oficial</span>
                      <div className="flex items-center gap-2 mb-1">
                        <MercosulPlate plate={viewingAttachmentOrder.vehicle?.plate} size="sm" />
                        {viewingAttachmentOrder.vehicle?.prefix_code && (
                          <span className="text-xs font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg">
                            Prefixo: {viewingAttachmentOrder.vehicle.prefix_code}
                          </span>
                        )}
                      </div>
                      <span className="text-neutral-500 block text-[11px]">{viewingAttachmentOrder.vehicle?.model} • {viewingAttachmentOrder.vehicle?.department}</span>
                    </div>

                    <div>
                      <span className="text-neutral-400 block text-[10px] font-bold uppercase">Motorista / Condutor</span>
                      <strong className="text-neutral-900 dark:text-white font-semibold">
                        {viewingAttachmentOrder.driver_name} {viewingAttachmentOrder.driver_document ? `(${viewingAttachmentOrder.driver_document})` : ''}
                      </strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-400 block text-[10px] font-bold">Odômetro Anterior:</span>
                        <strong className="font-mono text-xs">
                          {!viewingAttachmentOrder.previous_odometer || viewingAttachmentOrder.previous_odometer <= 0
                            ? '0 km (Base Inicial)'
                            : `${formatThousands(viewingAttachmentOrder.previous_odometer)} km`}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-400 block text-[10px] font-bold">Odômetro Atual Lido:</span>
                        <strong className="font-mono text-xs text-blue-600 dark:text-blue-400">
                          {viewingAttachmentOrder.current_odometer ? `${formatThousands(viewingAttachmentOrder.current_odometer)} km` : '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-400 block text-[10px] font-bold">Litragem Faturada:</span>
                        <strong className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          {Number(viewingAttachmentOrder.liters_supplied || viewingAttachmentOrder.liters_authorized || 0).toFixed(2)} L
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-400 block text-[10px] font-bold">Consumo Apurado:</span>
                        <strong className="font-mono text-xs">
                          {(() => {
                            const isFirst = !viewingAttachmentOrder.previous_odometer || viewingAttachmentOrder.previous_odometer <= 0;
                            const c = Number(viewingAttachmentOrder.calculated_km_per_liter || viewingAttachmentOrder.calculated_consumption || 0);
                            if (isFirst) return 'Odômetro Base';
                            if (!isNaN(c) && c > 0 && c <= 50) return `${c.toFixed(1)} km/l`;
                            return '—';
                          })()}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-800 dark:text-amber-300 font-bold block flex items-center gap-1.5">
                          <Layers size={13} className="text-amber-600" />
                          Dotação Orçamentária:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditingViewerBudget) {
                              setViewerBudgetId(viewingAttachmentOrder.budget_classification_id || (viewingAttachmentOrder.budget_classification as any)?.id || viewingAttachmentOrder.vehicle?.budget_classification_id || '');
                            }
                            setIsEditingViewerBudget(!isEditingViewerBudget);
                          }}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 size={11} />
                          <span>{isEditingViewerBudget ? 'Cancelar' : 'Alterar Ficha'}</span>
                        </button>
                      </div>

                      {isEditingViewerBudget ? (
                        <div className="space-y-2 pt-1 border-t border-amber-200 dark:border-amber-800/60">
                          <select
                            value={viewerBudgetId}
                            onChange={(e) => setViewerBudgetId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="">-- Selecione a Dotação Orçamentária --</option>
                            {sortedBudgetClassifications.map(bc => (
                              <option key={bc.id} value={bc.id}>
                                {bc.invoice_sheet} • {bc.department_local} — Fonte {bc.funding_source} {bc.budget_code ? `(Cód: ${bc.budget_code})` : ''}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingViewerBudget(false)}
                              className="px-2.5 py-1 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveViewerBudget}
                              disabled={savingViewerBudget || !viewerBudgetId}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                            >
                              {savingViewerBudget ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              <span>Salvar Dotação</span>
                            </button>
                          </div>
                        </div>
                      ) : (() => {
                        const resolvedBc = resolveOrderBudget(
                          viewingAttachmentOrder,
                          viewingAttachmentOrder.vehicle || vehicles.find(v => v.id === viewingAttachmentOrder.vehicle_id),
                          budgetClassifications
                        );
                        return (
                          <span className="text-neutral-700 dark:text-neutral-300 block">
                            Dotação: <strong>{resolvedBc ? `Ficha ${resolvedBc.invoice_sheet}` : 'Não definida'}</strong> • 
                            Fonte: <strong>{resolvedBc?.funding_source || '—'}</strong> • 
                            Local: <em>{resolvedBc?.department_local || viewingAttachmentOrder.vehicle?.department || 'Geral'}</em>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: FOTOS E COMPROVANTES EM ALTA RESOLUÇÃO */}
                <div className="lg:col-span-7 space-y-3">
                  {/* Abas das Fotos (Sem Nota Fiscal) */}
                  <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSelectedAttachmentPhoto('pump')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedAttachmentPhoto === 'pump'
                          ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      <Fuel size={13} />
                      <span>1. Visor da Bomba</span>
                      {viewingAttachmentOrder.pump_photo_url && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedAttachmentPhoto('odometer')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedAttachmentPhoto === 'odometer'
                          ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      <Gauge size={13} />
                      <span>2. Painel / KM</span>
                      {viewingAttachmentOrder.odometer_photo_url && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedAttachmentPhoto('receipt')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedAttachmentPhoto === 'receipt'
                          ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      <FileCheck size={13} />
                      <span>3. Canhoto</span>
                      {(viewingAttachmentOrder.receipt_photo_url || viewingAttachmentOrder.receipt_attachment_url) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  </div>

                  {/* Foto Ativa em Destaque */}
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden bg-neutral-950 flex flex-col items-center justify-center min-h-[320px] max-h-[420px] relative">
                    {(() => {
                      let activeUrl = '';
                      let photoLabel = '';

                      if (selectedAttachmentPhoto === 'pump') {
                        activeUrl = viewingAttachmentOrder.pump_photo_url || '';
                        photoLabel = 'Foto do Visor da Bomba (Litros e Valor Registrados)';
                      } else if (selectedAttachmentPhoto === 'odometer') {
                        activeUrl = viewingAttachmentOrder.odometer_photo_url || '';
                        photoLabel = 'Foto do Painel do Veículo (Odômetro Atual)';
                      } else {
                        activeUrl = viewingAttachmentOrder.receipt_photo_url || viewingAttachmentOrder.receipt_attachment_url || '';
                        photoLabel = 'Foto do Canhoto Físico Oficial Assinado';
                      }

                      if (!activeUrl) {
                        return (
                          <div className="p-8 text-center text-neutral-400 space-y-2">
                            <Camera size={36} className="mx-auto opacity-40" />
                            <p className="text-xs font-semibold">{photoLabel}</p>
                            <span className="text-[11px] text-neutral-500 block">Nenhuma imagem anexada nesta categoria</span>
                          </div>
                        );
                      }

                      return (
                        <div className="w-full h-full relative group">
                          <img
                            src={activeUrl}
                            alt={photoLabel}
                            className="w-full h-[360px] object-contain bg-black/60"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex justify-between items-center text-white">
                            <span className="text-xs font-bold truncate max-w-sm">{photoLabel}</span>
                            <a
                              href={activeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold backdrop-blur-sm transition-all"
                            >
                              Ver em Tela Cheia ↗
                            </a>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Miniaturas Rápidas Lado a Lado (Bomba, Odômetro e Canhoto) */}
                  {(viewingAttachmentOrder.pump_photo_url || viewingAttachmentOrder.odometer_photo_url || viewingAttachmentOrder.receipt_photo_url || viewingAttachmentOrder.receipt_attachment_url) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {viewingAttachmentOrder.pump_photo_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedAttachmentPhoto('pump')}
                          className={`p-1.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                            selectedAttachmentPhoto === 'pump'
                              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-amber-400'
                          }`}
                        >
                          <img src={viewingAttachmentOrder.pump_photo_url} alt="Bomba" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase text-amber-600 block">Visor Bomba</span>
                            <span className="text-[10px] text-neutral-500 truncate block">Ver foto</span>
                          </div>
                        </button>
                      )}
                      {viewingAttachmentOrder.odometer_photo_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedAttachmentPhoto('odometer')}
                          className={`p-1.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                            selectedAttachmentPhoto === 'odometer'
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
                          }`}
                        >
                          <img src={viewingAttachmentOrder.odometer_photo_url} alt="Odômetro" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase text-blue-600 block">Odômetro</span>
                            <span className="text-[10px] text-neutral-500 truncate block">Ver foto</span>
                          </div>
                        </button>
                      )}
                      {(viewingAttachmentOrder.receipt_photo_url || viewingAttachmentOrder.receipt_attachment_url) && (
                        <button
                          type="button"
                          onClick={() => setSelectedAttachmentPhoto('receipt')}
                          className={`p-1.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                            selectedAttachmentPhoto === 'receipt'
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-emerald-400'
                          }`}
                        >
                          <img 
                            src={viewingAttachmentOrder.receipt_photo_url || viewingAttachmentOrder.receipt_attachment_url} 
                            alt="Canhoto" 
                            className="w-12 h-12 rounded-lg object-cover shrink-0" 
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase text-emerald-600 block">Canhoto Físico</span>
                            <span className="text-[10px] text-neutral-500 truncate block">Ver foto</span>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-xs text-neutral-500">
                  Comprovação por fotos na bomba e painel • <strong>Sem exigência de Nota Fiscal</strong>
                </div>
                <div className="flex items-center gap-2">
                  {viewingAttachmentOrder.status === 'auditado' && (
                    <button
                      type="button"
                      onClick={() => {
                        const ord = viewingAttachmentOrder;
                        setViewingAttachmentOrder(null);
                        handleCancelHomologation(ord);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 hover:text-rose-900 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                      title="Cancelar homologação para poder editar odômetro, litragem ou notas"
                    >
                      <RotateCcw size={13} className="text-rose-600" />
                      <span>Cancelar Homologação</span>
                    </button>
                  )}
                  <button
                    onClick={() => setViewingAttachmentOrder(null)}
                    className="px-5 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-xl cursor-pointer"
                  >
                    Fechar Visualizador
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: EDITAR VEÍCULO DA FROTA */}
      <AnimatePresence>
        {isEditVehicleModalOpen && editingVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Edit2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Editar Veículo Oficial ({editingVehicle.plate})
                    </h3>
                    <p className="text-neutral-400 text-xs">Atualização de parâmetros técnicos e lotação</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditVehicleModalOpen(false);
                    setEditingVehicle(null);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditVehicle} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Placa Oficial *
                    </label>
                    <input
                      type="text"
                      value={editVehicleForm.plate}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, plate: e.target.value.toUpperCase() })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Prefixo do Veículo
                    </label>
                    <input
                      type="text"
                      value={editVehicleForm.prefix_code}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, prefix_code: e.target.value.toUpperCase() })}
                      placeholder="Ex: AMB-04"
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Modelo / Fabricante *
                  </label>
                  <input
                    type="text"
                    value={editVehicleForm.model}
                    onChange={e => setEditVehicleForm({ ...editVehicleForm, model: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Secretaria / Lotação *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDepartmentsModalOpen(true)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        + Gerenciar
                      </button>
                    </div>
                    <select
                      value={editVehicleForm.department}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, department: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Selecione a secretaria...</option>
                      {editVehicleForm.department && !departments.includes(editVehicleForm.department) && (
                        <option value={editVehicleForm.department}>{editVehicleForm.department} (Legado)</option>
                      )}
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Combustível Homologado
                    </label>
                    <select
                      value={editVehicleForm.fuel_type}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, fuel_type: e.target.value as FuelType })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="diesel_s10">Diesel S-10</option>
                      <option value="diesel_s500">Diesel S-500</option>
                      <option value="gasolina">Gasolina Comum</option>
                      <option value="etanol">Etanol Hidratado</option>
                      <option value="arla32">Arla 32</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Capacidade Tanque (L) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={editVehicleForm.tank_capacity}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, tank_capacity: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Métrica de Medição
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Odômetro (KM)"
                      className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Consumo Ref. *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editVehicleForm.expected_consumption}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, expected_consumption: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Odômetro Atual (KM)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={editVehicleForm.current_odometer}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, current_odometer: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Status Operacional
                    </label>
                    <select
                      value={editVehicleForm.status}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="ativo">Ativo (Em circulação)</option>
                      <option value="manutencao">Em Manutenção / Oficina</option>
                      <option value="baixado">Baixado / Leilão (Desativado)</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Classificação Orçamentária (Centro de Custo / Ficha)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsBudgetClassificationsModalOpen(true)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Gerenciar Fichas
                    </button>
                  </div>
                  <select
                    value={editVehicleForm.budget_classification_id}
                    onChange={e => setEditVehicleForm({ ...editVehicleForm, budget_classification_id: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Selecione a dotação contábil...</option>
                    {sortedBudgetClassifications.map(bc => (
                      <option key={bc.id} value={bc.id}>
                        {bc.invoice_sheet} • {bc.department_local} — Fonte {bc.funding_source} {bc.budget_code ? `(Cód: ${bc.budget_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MODALIDADE PREFERENCIAL: ENCHER O TANQUE (TOP-OFF) */}
                <div className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editVehicleForm.always_full_tank}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, always_full_tank: e.target.checked })}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        ⛽ Regime Obrigatório de Tanque Cheio (Top-Off Contínuo)
                      </span>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-tight">
                        Autoriza automaticamente o veículo a completar o tanque até o desarme da bomba.
                      </p>
                    </div>
                  </label>
                </div>

                {/* PRIORIDADE DE PRONTIDÃO 24H (AMBULÂNCIA / ÔNIBUS) */}
                <div className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editVehicleForm.is_emergency_priority}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, is_emergency_priority: e.target.checked })}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                        🚨 Veículo de Prontidão 24h / Urgência (Ambulância, Resgate ou Transporte Escolar)
                      </span>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 leading-tight">
                        Habilita a emissão automática em regime de Tanque Cheio com rastreamento antifraude por KM rodada.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditVehicleModalOpen(false);
                      setEditingVehicle(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: CADASTRO / EDIÇÃO DE MOTORISTA */}
      <AnimatePresence>
        {(isNewDriverModalOpen || isEditDriverModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      {editingDriver ? 'Editar Motorista Oficial' : 'Cadastrar Novo Motorista'}
                    </h3>
                    <p className="text-neutral-400 text-xs">Dados funcionais, CPF e data de nascimento</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsNewDriverModalOpen(false);
                    setIsEditDriverModalOpen(false);
                    setEditingDriver(null);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveDriver} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Nome Completo do Motorista *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva Ferreira"
                      value={driverForm.full_name}
                      onChange={e => setDriverForm({ ...driverForm, full_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      CPF <span className="text-neutral-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00 (opcional)"
                      value={driverForm.cpf}
                      onChange={e => setDriverForm({ ...driverForm, cpf: formatCPF(e.target.value) })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={driverForm.birth_date}
                      onChange={e => setDriverForm({ ...driverForm, birth_date: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Secretaria de Lotação *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDepartmentsModalOpen(true)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Cadastrar / Excluir Secretarias
                      </button>
                    </div>
                    <select
                      value={driverForm.department}
                      onChange={e => setDriverForm({ ...driverForm, department: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Selecione a secretaria oficial...</option>
                      {driverForm.department && !departments.includes(driverForm.department) && (
                        <option value={driverForm.department}>{driverForm.department} (Fora do padrão)</option>
                      )}
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Status Funcional
                    </label>
                    <select
                      value={driverForm.status}
                      onChange={e => setDriverForm({ ...driverForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="ativo">Ativo (Em escala regular)</option>
                      <option value="afastado">Afastado / Licença médica</option>
                      <option value="inativo">Inativo / Desligado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Número da CNH
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 04958392019"
                      value={driverForm.cnh_number}
                      onChange={e => setDriverForm({ ...driverForm, cnh_number: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Categoria CNH
                    </label>
                    <select
                      value={driverForm.cnh_category}
                      onChange={e => setDriverForm({ ...driverForm, cnh_category: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="A">A (Moto)</option>
                      <option value="B">B (Carro)</option>
                      <option value="C">C (Caminhão leve)</option>
                      <option value="D">D (Ônibus / Van)</option>
                      <option value="E">E (Carreta / Articulado)</option>
                      <option value="AB">AB</option>
                      <option value="AC">AC</option>
                      <option value="AD">AD</option>
                      <option value="AE">AE</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewDriverModalOpen(false);
                      setIsEditDriverModalOpen(false);
                      setEditingDriver(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {editingDriver ? 'Salvar Alterações' : 'Cadastrar Motorista'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 8: CADASTRO / EDIÇÃO DE POSTO CREDENCIADO */}
      <AnimatePresence>
        {(isNewStationModalOpen || isEditStationModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      {editingStation ? 'Editar Posto Credenciado' : 'Cadastrar Novo Posto Conveniado'}
                    </h3>
                    <p className="text-neutral-400 text-xs">Fornecedor credenciado para abastecimento de combustíveis</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsNewStationModalOpen(false);
                    setIsEditStationModalOpen(false);
                    setEditingStation(null);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveStation} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Razão Social / Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Auto Posto Central Torixoréu Ltda"
                    value={stationForm.name}
                    onChange={e => setStationForm({ ...stationForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      CNPJ do Posto
                    </label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={stationForm.cnpj}
                      onChange={e => setStationForm({ ...stationForm, cnpj: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Telefone / Contato
                    </label>
                    <input
                      type="text"
                      placeholder="(66) 3406-1122"
                      value={stationForm.phone}
                      onChange={e => setStationForm({ ...stationForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Endereço / Localização
                    </label>
                    <input
                      type="text"
                      placeholder="Av. Principal, nº 450 - Centro"
                      value={stationForm.address}
                      onChange={e => setStationForm({ ...stationForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Cidade / UF
                    </label>
                    <input
                      type="text"
                      placeholder="Torixoréu - MT"
                      value={stationForm.city}
                      onChange={e => setStationForm({ ...stationForm, city: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Status de Credenciamento
                  </label>
                  <select
                    value={stationForm.status}
                    onChange={e => setStationForm({ ...stationForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ativo">Credenciado (Ativo para emissão)</option>
                    <option value="inativo">Inativo / Descredenciado</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewStationModalOpen(false);
                      setIsEditStationModalOpen(false);
                      setEditingStation(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {editingStation ? 'Salvar Alterações' : 'Cadastrar Posto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 9: TABELA DE PREÇOS LICITADOS E REEQUILÍBRIO CONTRATUAL */}
      <AnimatePresence>
        {isPriceConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Preços Licitados & Reequilíbrio Contratual
                    </h3>
                    <p className="text-neutral-400 text-xs">
                      Valores homologados por combustível e termos de aditivo (Lei 14.133/2021)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPriceConfigModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveBiddedPrices} className="mt-4 space-y-4">
                {/* Banner de Conformidade TCE */}
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-0.5">Parâmetros Licitatórios Travados na Emissão</strong>
                    <span>
                      Toda ordem de fornecimento emitida utilizará obrigatoriamente os preços unitários desta tabela. Havendo reajuste ou reequilíbrio econômico homologado, atualize os valores abaixo indicando o Termo Aditivo.
                    </span>
                  </div>
                </div>

                {/* Grade de Combustíveis e Valores Licitados */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 tracking-wider">
                    Valores Homologados por Combustível (R$ / Litro)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'arla32'] as const).map(fuel => {
                      const item = priceEditForm[fuel] || { price: 6.00, name: fuel, contractNumber: '' };
                      return (
                        <div
                          key={fuel}
                          className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                              {item.name || fuel}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold">
                              {fuel.toUpperCase().replace('_', ' ')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-neutral-500 font-bold mb-0.5">
                                Preço Licitado (R$/L) *
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-xs font-bold text-neutral-400">R$</span>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  required
                                  value={item.price}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setPriceEditForm(prev => ({
                                      ...prev,
                                      [fuel]: {
                                        ...prev[fuel],
                                        price: val
                                      }
                                    }));
                                  }}
                                  className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-xl text-xs font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] text-neutral-500 font-bold mb-0.5">
                                Ata / Lote Contratual
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: ATA 042/26 - Lote 01"
                                value={item.contractNumber || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setPriceEditForm(prev => ({
                                    ...prev,
                                    [fuel]: {
                                      ...prev[fuel],
                                      contractNumber: val
                                    }
                                  }));
                                }}
                                className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-xl text-[11px] font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Registro Formal do Reequilíbrio */}
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                  <span className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <FileCheck size={14} className="text-amber-600" />
                    Registro de Reequilíbrio / Termo Aditivo
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Instrumento Jurídico / Termo Aditivo
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Termo Aditivo nº 02/2026 - Reequilíbrio ANP"
                        value={rebalanceTermInput}
                        onChange={e => setRebalanceTermInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Motivação / Fundamentação Legal
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Variação de preços comprovada por nota fiscal de refinaria"
                        value={rebalanceReasonInput}
                        onChange={e => setRebalanceReasonInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Rodapé do Modal */}
                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsPriceConfigModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare size={14} />
                    <span>Salvar e Atualizar Preços Licitados</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 10: VINCULAÇÃO DE NOTA FISCAL FATURADA (CONTROLE INTERNO) */}
      <AnimatePresence>
        {isLinkInvoiceModalOpen && invoiceLinkOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Vincular Nota Fiscal à Requisição
                    </h3>
                    <p className="text-neutral-400 text-xs">Controle Interno & Conciliação Faturada</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsLinkInvoiceModalOpen(false);
                    setInvoiceLinkOrder(null);
                    setInvoiceLinkNumber('');
                  }}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveLinkedInvoice} className="mt-4 space-y-4">
                {/* Resumo da Requisição */}
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Ordem de Fornecimento:</span>
                    <span className="font-mono font-bold text-amber-600">{invoiceLinkOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Veículo Oficial:</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {invoiceLinkOrder.vehicle?.model || 'Veículo Municipal'} ({invoiceLinkOrder.vehicle?.plate})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Motorista:</span>
                    <span className="font-medium">{invoiceLinkOrder.driver_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Combustível & Litros:</span>
                    <span className="font-bold text-blue-600">
                      {invoiceLinkOrder.liters_supplied || invoiceLinkOrder.liters_authorized} L ({formatFuelLabel(invoiceLinkOrder.fuel_type)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-500">Valor Homologado:</span>
                    <strong className="text-emerald-600 font-bold">
                      R$ {Number(invoiceLinkOrder.total_authorized_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* Input do Número da Nota Fiscal */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Número da Nota Fiscal / Fatura Eletrônica (NF-e) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NF-e 004821 ou Fatura Mensal 2026/089"
                    value={invoiceLinkNumber}
                    onChange={e => setInvoiceLinkNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Insira o número da nota fiscal enviada posteriormente pelo posto conveniado para liquidar a despesa.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLinkInvoiceModalOpen(false);
                      setInvoiceLinkOrder(null);
                      setInvoiceLinkNumber('');
                    }}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare size={14} />
                    <span>Vincular Nota Fiscal</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 11: EDIÇÃO / REMANEJAMENTO RÁPIDO DE FICHA ORÇAMENTÁRIA DA ORDEM */}
      <AnimatePresence>
        {orderForBudgetEdit && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                      Editar Ficha Orçamentária
                    </h3>
                    <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                      Ordem: {orderForBudgetEdit.order_number}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderForBudgetEdit(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveOrderBudgetModal} className="mt-4 space-y-4">
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Veículo Oficial:</span>
                    <strong className="text-neutral-900 dark:text-white font-mono">
                      {orderForBudgetEdit.vehicle?.plate || 'SEM PLACA'} {orderForBudgetEdit.vehicle?.prefix_code ? `(${orderForBudgetEdit.vehicle.prefix_code})` : ''} - {orderForBudgetEdit.vehicle?.model}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Secretaria / Lotação:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {orderForBudgetEdit.vehicle?.department || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Condutor:</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {orderForBudgetEdit.driver_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-500">Dotação Atual Vinculada:</span>
                    {(() => {
                      const resolvedBc = resolveOrderBudget(
                        orderForBudgetEdit,
                        orderForBudgetEdit.vehicle || vehicles.find(v => v.id === orderForBudgetEdit.vehicle_id),
                        budgetClassifications
                      );
                      return (
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {resolvedBc ? `Ficha ${resolvedBc.invoice_sheet}` : 'Não definida'} {resolvedBc?.funding_source ? `(Fonte ${resolvedBc.funding_source})` : ''}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Layers size={13} className="text-amber-500" />
                      Selecione a Nova Dotação Orçamentária *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsBudgetClassificationsModalOpen(true)}
                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      + Cadastrar Nova Ficha
                    </button>
                  </div>
                  <select
                    value={budgetEditId}
                    onChange={(e) => setBudgetEditId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- Selecione a Dotação Orçamentária --</option>
                    {sortedBudgetClassifications.map(bc => (
                      <option key={bc.id} value={bc.id}>
                        {bc.invoice_sheet} • {bc.department_local} — Fonte {bc.funding_source} {bc.budget_code ? `(Cód: ${bc.budget_code})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Ao salvar, a despesa desta autorização será reclassificada contabilmente no centro de custo e fonte selecionados.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setOrderForBudgetEdit(null)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingOrderBudget || !budgetEditId}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-amber-600/20 disabled:opacity-50"
                  >
                    {savingOrderBudget ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Salvar Nova Ficha</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE GERENCIAMENTO E PADRONIZAÇÃO DAS SECRETARIAS DO MUNICÍPIO */}
      <AnimatePresence>
        {isDepartmentsModalOpen && (
          <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Secretarias Oficiais do Município
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Cadastre ou exclua as secretarias criadas pelo município para padronizar todo o sistema.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDepartmentsModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                <form onSubmit={handleAddMunicipalDepartment} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Secretaria Municipal de Administração e Finanças"
                    value={newDepartmentNameInput}
                    onChange={e => setNewDepartmentNameInput(e.target.value)}
                    required
                    className="flex-1 px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={savingDepartment || !newDepartmentNameInput.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                  >
                    <Plus size={15} />
                    {savingDepartment ? 'Salvando...' : 'Cadastrar Secretaria'}
                  </button>
                </form>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Secretarias Ativas no Município ({municipalDepartmentRecords.length})
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      Sincronizado com Frotas, Motoristas, Protocolo, Ouvidoria e Configurações
                    </span>
                  </div>

                  {municipalDepartmentRecords.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-500">
                      Nenhuma secretaria cadastrada ainda para este município. Cadastre acima a primeira secretaria oficial.
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      {municipalDepartmentRecords.map(dept => (
                        <div
                          key={dept.id}
                          className="flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 size={14} className="text-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                              {dept.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMunicipalDepartment(dept.id, dept.name)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer shrink-0"
                            title={`Excluir ${dept.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {legacyUnstandardizedDepartments.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-amber-600" />
                          Lotações fora do padrão encontradas ({legacyUnstandardizedDepartments.length})
                        </h4>
                        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                          Existem motoristas ou veículos com nomes abreviados/antigos. Você pode padronizá-los automaticamente para as secretarias oficiais.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={standardizingDepartments || !legacyUnstandardizedDepartments.some(i => i.suggested)}
                        onClick={() => handleStandardizeLegacyRecords()}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        {standardizingDepartments ? 'Padronizando...' : 'Padronizar Correspondências'}
                      </button>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto text-[11px]">
                      {legacyUnstandardizedDepartments.map(item => (
                        <div key={item.raw} className="flex items-center justify-between bg-white/80 dark:bg-neutral-900/70 px-2.5 py-1.5 rounded-lg border border-amber-200/70 dark:border-amber-900/50">
                          <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                            {item.raw}{' '}
                            <span className="text-neutral-500 font-sans font-normal">
                              ({item.drivers} mot., {item.vehicles} veíc.)
                            </span>
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            {item.suggested ? `→ ${item.suggested}` : 'Sem vínculo automático'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDepartmentsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMPORTADOR EM LOTE DE MOTORISTAS (.XLSX / .CSV) */}
      <DriverBatchImporter
        isOpen={isDriverBatchModalOpen}
        onClose={() => setIsDriverBatchModalOpen(false)}
        onSuccess={(count) => {
          showToast(`${count} motoristas importados com sucesso!`, 'success');
          loadData();
        }}
        institutionId={currentUser?.institution_id}
        officialDepartments={officialDepartments}
      />

      {/* CRUD DE CLASSIFICAÇÕES ORÇAMENTÁRIAS, CENTROS DE CUSTO E CRÉDITOS ESPECIAIS */}
      <BudgetClassificationsModal
        isOpen={isBudgetClassificationsModalOpen}
        onClose={() => setIsBudgetClassificationsModalOpen(false)}
        onUpdated={(updatedList) => {
          setBudgetClassifications(updatedList);
          loadData();
        }}
        institutionId={currentUser?.institution_id}
      />

      {/* LANÇAMENTO E IMPORTAÇÃO DE CANHOTOS ANTIGOS (TALÃO DE PAPEL) */}
      <LegacyVoucherModal
        isOpen={isLegacyVoucherModalOpen}
        onClose={() => setIsLegacyVoucherModalOpen(false)}
        vehicles={vehicles}
        drivers={drivers}
        stations={stations}
        biddedPrices={biddedPrices}
        budgetClassifications={budgetClassifications}
        onSuccess={() => {
          loadData();
        }}
        institutionId={currentUser?.institution_id}
      />
    </div>
  );
};

