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
  toBudgetUUID
} from '../../../lib/api/fleetFuel';
import { imprimirOrdemAbastecimento } from './OrdemAbastecimentoPDF';
import { imprimirCanhotoDuasVias, formatFuelLabel } from './FuelAuthorizationVoucherPDF';
import { DriverBatchImporter } from './DriverBatchImporter';
import { BudgetClassificationsModal } from './BudgetClassificationsModal';
import { LegacyVoucherModal } from './LegacyVoucherModal';
import { MercosulPlate } from './MercosulPlate';
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
  liters?: number;
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

  // Notificações e Campainha da Frota (inclui recebidas offline)
  const [notifications, setNotifications] = useState<FleetNotification[]>(() => {
    try {
      const instId = currentUser?.institution_id || 'inst_1';
      const raw = localStorage.getItem(`gestao360_fleet_notifications_${instId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'abastecimento' | 'alerta'>('all');
  const [bellAnimate, setBellAnimate] = useState(false);
  const notificationDropdownRef = React.useRef<HTMLDivElement>(null);

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

  // Estado para Gestão de Motoristas
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [isEditDriverModalOpen, setIsEditDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<FleetDriver | null>(null);
  const [driverForm, setDriverForm] = useState({
    full_name: '',
    cpf: '',
    birth_date: '',
    department: 'Saúde',
    cnh_number: '',
    cnh_category: 'B',
    status: 'ativo' as 'ativo' | 'inativo' | 'afastado'
  });

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

  // Notificações filtradas para o dropdown
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (notificationFilter === 'unread') return !n.read;
      if (notificationFilter === 'abastecimento') return n.type === 'abastecimento';
      if (notificationFilter === 'alerta') return n.type === 'bloqueio_tce' || n.type === 'alerta_auditoria';
      return true;
    });
  }, [notifications, notificationFilter]);

  // Sincronizar e recuperar notificações (inclusive geradas enquanto o usuário esteve offline)
  const syncNotificationsWithOrders = (ordList: FuelSupplyOrder[], vehList: FleetVehicle[], instId: string) => {
    try {
      const storageKey = `gestao360_fleet_notifications_${instId}`;
      const lastVisitKey = `gestao360_fleet_last_visit_${instId}`;

      let currentNotifs: FleetNotification[] = [];
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          currentNotifs = JSON.parse(stored);
        } catch {}
      }

      const rawLastVisit = localStorage.getItem(lastVisitKey);
      // Se nunca visitou, consideramos as últimas 48 horas como janela de verificação
      const lastVisitTime = rawLastVisit ? new Date(rawLastVisit).getTime() : Date.now() - 48 * 3600 * 1000;

      const newNotifs: FleetNotification[] = [];

      ordList.forEach(ord => {
        const v = ord.vehicle || vehList.find(item => item.id === ord.vehicle_id);
        const orderTime = ord.supplied_at ? new Date(ord.supplied_at).getTime() : new Date(ord.created_at).getTime();
        const wasWhileOffline = orderTime > lastVisitTime;

        // 1. Notificação de Abastecimento Realizado / Fotos
        if (ord.status === 'abastecido' || ord.status === 'auditado' || ord.status === 'glosado' || ord.pump_photo_url || ord.odometer_photo_url) {
          const notifId = `notif_supply_${ord.order_number}`;
          const exists = currentNotifs.some(n => n.id === notifId || (n.orderNumber === ord.order_number && n.type === 'abastecimento'));
          if (!exists) {
            newNotifs.push({
              id: notifId,
              orderId: ord.id,
              orderNumber: ord.order_number,
              type: 'abastecimento',
              title: `Abastecimento Confirmado`,
              message: `${v?.plate || 'Sem Placa'} • ${v?.model || 'Veículo'} (${Number(ord.liters_supplied || ord.liters_authorized).toFixed(1)} L) por ${ord.driver_name}`,
              plate: v?.plate,
              vehicleModel: v?.model,
              driverName: ord.driver_name,
              liters: ord.liters_supplied || ord.liters_authorized,
              timestamp: ord.supplied_at || ord.created_at || new Date().toISOString(),
              read: !wasWhileOffline, // se ocorreu enquanto esteve offline, fica NÃO LIDA!
              hasPhotos: Boolean(ord.pump_photo_url || ord.odometer_photo_url),
              anomalyLevel: ord.anomaly_level,
              anomalyReason: ord.anomaly_reason
            });
          }
        }

        // 2. Notificação de Alerta Antifraude / Bloqueio TCE
        if (ord.anomaly_level === 'bloqueio_critico' || ord.anomaly_level === 'alerta_amarelo' || ord.is_anomaly) {
          const isCritical = ord.anomaly_level === 'bloqueio_critico';
          const notifId = `notif_anomaly_${ord.order_number}`;
          const exists = currentNotifs.some(n => n.id === notifId || (n.orderNumber === ord.order_number && (n.type === 'bloqueio_tce' || n.type === 'alerta_auditoria')));
          if (!exists) {
            newNotifs.push({
              id: notifId,
              orderId: ord.id,
              orderNumber: ord.order_number,
              type: isCritical ? 'bloqueio_tce' : 'alerta_auditoria',
              title: isCritical ? 'Bloqueio Crítico TCE' : 'Alerta de Consumo TCE',
              message: ord.anomaly_reason || 'Inconsistência identificada na auditoria de odômetro ou consumo.',
              plate: v?.plate,
              vehicleModel: v?.model,
              driverName: ord.driver_name,
              liters: ord.liters_supplied || ord.liters_authorized,
              timestamp: ord.supplied_at || ord.created_at || new Date().toISOString(),
              read: !wasWhileOffline, // se ocorreu enquanto esteve offline, fica NÃO LIDA!
              hasPhotos: Boolean(ord.pump_photo_url || ord.odometer_photo_url),
              anomalyLevel: ord.anomaly_level,
              anomalyReason: ord.anomaly_reason
            });
          }
        }
      });

      const mergedMap = new Map<string, FleetNotification>();
      newNotifs.forEach(n => mergedMap.set(n.id, n));
      currentNotifs.forEach(n => {
        if (!mergedMap.has(n.id)) mergedMap.set(n.id, n);
      });

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const trimmed = mergedList.slice(0, 100);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
      setNotifications(trimmed);

      // Atualiza lastVisit
      localStorage.setItem(lastVisitKey, new Date().toISOString());
    } catch (err) {
      console.warn('[FleetFuelManager] Erro ao sincronizar notificações:', err);
    }
  };

  const addRealtimeNotification = (ord: any) => {
    if (!ord) return;
    const v = ord.vehicle || vehicles.find(item => item.id === ord.vehicle_id);
    const isCritical = ord.anomaly_level === 'bloqueio_critico';
    const isAnomaly = ord.is_anomaly || isCritical || ord.anomaly_level === 'alerta_amarelo';
    
    const notif: FleetNotification = {
      id: `notif_realtime_${ord.order_number || Date.now()}_${Date.now()}`,
      orderId: ord.id,
      orderNumber: ord.order_number || 'Ordem Digital',
      type: isCritical ? 'bloqueio_tce' : isAnomaly ? 'alerta_auditoria' : 'abastecimento',
      title: isCritical 
        ? `Bloqueio Crítico TCE: ${ord.order_number || ''}` 
        : isAnomaly 
        ? `Alerta de Auditoria: ${ord.order_number || ''}` 
        : `Abastecimento Confirmado na Bomba`,
      message: `${v?.plate || 'Sem Placa'} • ${v?.model || 'Veículo Municipal'} (${Number(ord.liters_supplied || ord.liters_authorized || 0).toFixed(1)} L) por ${ord.driver_name || 'Condutor'}`,
      plate: v?.plate,
      vehicleModel: v?.model,
      driverName: ord.driver_name,
      liters: ord.liters_supplied || ord.liters_authorized,
      timestamp: new Date().toISOString(),
      read: false,
      hasPhotos: Boolean(ord.pump_photo_url || ord.odometer_photo_url),
      anomalyLevel: ord.anomaly_level,
      anomalyReason: ord.anomaly_reason
    };

    setNotifications(prev => {
      const updated = [notif, ...prev.filter(n => n.id !== notif.id)].slice(0, 100);
      const instId = currentUser?.institution_id || 'inst_1';
      try {
        localStorage.setItem(`gestao360_fleet_notifications_${instId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setBellAnimate(true);
    setTimeout(() => setBellAnimate(false), 2000);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      const instId = currentUser?.institution_id || 'inst_1';
      try {
        localStorage.setItem(`gestao360_fleet_notifications_${instId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Todas as notificações foram marcadas como lidas.', 'info');
  };

  const clearNotificationHistory = () => {
    const instId = currentUser?.institution_id || 'inst_1';
    setNotifications([]);
    try {
      localStorage.removeItem(`gestao360_fleet_notifications_${instId}`);
    } catch {}
    showToast('Histórico de notificações limpo.', 'info');
  };

  const handleNotificationClick = (notif: FleetNotification) => {
    // 1. Marca como lida
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notif.id ? { ...n, read: true } : n);
      const instId = currentUser?.institution_id || 'inst_1';
      try {
        localStorage.setItem(`gestao360_fleet_notifications_${instId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Se a ordem existe, abre o visualizador de fotos e detalhes imediatamente!
    const targetOrder = orders.find(o => o.order_number === notif.orderNumber || o.id === notif.orderId);
    if (targetOrder) {
      openAttachmentViewer(targetOrder);
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
      // Se possui apenas canhoto anexado (ex: lançamento retroativo), abre direto na aba do canhoto!
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

      // Detectar em tempo real se alguma ordem foi abastecida ou recebeu fotos via celular na bomba
      ordList.forEach(ord => {
        const prevStatus = prevStatusesRef.current[ord.id] || prevStatusesRef.current[ord.order_number];
        const prevHadPhotos = prevPhotosRef.current[ord.id];
        const nowHasPhotos = Boolean(ord.pump_photo_url || ord.odometer_photo_url);

        const statusJustCompleted =
          prevStatus &&
          (prevStatus === 'autorizado_pendente' || prevStatus === 'aguardando_abastecimento' || prevStatus === 'autorizado') &&
          (ord.status === 'abastecido' || ord.status === 'auditado' || ord.status === 'glosado');

        const photosJustArrived = prevHadPhotos === false && nowHasPhotos;

        if (statusJustCompleted || photosJustArrived) {
          playFuelAlertChime();
          sendDesktopNotification(
            '⛽ Abastecimento Confirmado na Bomba!',
            `Ordem ${ord.order_number} (${ord.vehicle?.plate || ''}) abastecida com ${ord.liters_supplied || ''}L. Fotos recebidas.`
          );
          showToast(`⛽ Abastecimento recebido na bomba! Ordem ${ord.order_number} (${ord.vehicle?.plate || ''}) finalizada pelo condutor com fotos anexadas.`, 'success');
          addRealtimeNotification(ord);
        }
        prevStatusesRef.current[ord.id] = ord.status;
        prevStatusesRef.current[ord.order_number] = ord.status;
        prevPhotosRef.current[ord.id] = nowHasPhotos;
      });

      // Sincroniza e recupera notificações (inclusive ordens abastecidas enquanto offline)
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
    setEditVehicleForm({
      plate: vehicle.plate,
      prefix_code: vehicle.prefix_code || '',
      model: vehicle.model,
      department: vehicle.department,
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
      department: 'Saúde',
      cnh_number: '',
      cnh_category: 'B',
      status: 'ativo'
    });
    setEditingDriver(null);
    setIsNewDriverModalOpen(true);
  };

  const handleOpenEditDriver = (driver: FleetDriver) => {
    setEditingDriver(driver);
    setDriverForm({
      full_name: driver.full_name,
      cpf: driver.cpf,
      birth_date: driver.birth_date || '',
      department: driver.department,
      cnh_number: driver.cnh_number || '',
      cnh_category: driver.cnh_category || 'B',
      status: driver.status
    });
    setIsEditDriverModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.full_name.trim() || !driverForm.cpf.trim()) {
      showToast('Preencha os campos obrigatórios (Nome Completo e CPF).', 'warning');
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
    if (!confirm(`Deseja realmente remover o condutor ${driver.full_name} (CPF: ${driver.cpf})?\n\nEle será excluído definitivamente do banco de dados e do sistema.`)) {
      return;
    }
    try {
      setDrivers(prev => prev.filter(d => d.id !== driver.id && (!driver.cpf || d.cpf !== driver.cpf)));
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
      playFuelAlertChime();
      showToast(`⛽ Abastecimento recebido! Ordem ${orderNumber ? `"${orderNumber}" ` : ''}confirmada na bomba com fotos.`, 'success');
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
          playFuelAlertChime();
          sendDesktopNotification(
            '⛽ Abastecimento Recebido na Bomba!',
            `Ordem ${ord?.order_number || ''} abastecida com fotos do visor.`
          );
          showToast(`⛽ Abastecimento recebido em tempo real! Ordem ${ord?.order_number || ''} abastecida na bomba com fotos do visor e odômetro.`, 'success');
          if (ord) addRealtimeNotification(ord);
          loadData(true);
        }
      };
    }

    // 3. Supabase Realtime para notificações remotas do celular do motorista
    const channel = supabase
      .channel('fuel_supply_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fuel_supply_orders' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as any;
            if (updated && (updated.status === 'abastecido' || updated.pump_photo_url)) {
              playFuelAlertChime();
              sendDesktopNotification(
                '⛽ Abastecimento Confirmado na Bomba!',
                `Ordem ${updated.order_number || ''} finalizada com sucesso. Fotos da bomba e odômetro recebidas.`
              );
              showToast(`⛽ Abastecimento confirmado na bomba! Ordem ${updated.order_number || ''} (${updated.liters_supplied ? `${updated.liters_supplied}L` : ''}) - Fotos do visor e odômetro recebidas!`, 'success');
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

  // Lista de Secretarias
  const departments = useMemo(() => {
    const fromVehicles = vehicles.map(v => v.department).filter(Boolean);
    const fromDrivers = drivers.map(d => d.department).filter(Boolean);
    const defaults = ['Gabinete do Prefeito', 'Administração', 'Educação', 'Saúde', 'Obras e Serviços Urbanos', 'Agricultura', 'Transportes'];
    const list = Array.from(new Set([...fromVehicles, ...fromDrivers, ...defaults]));
    return list.sort();
  }, [vehicles, drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const q = (driverSearchTerm || searchTerm).toLowerCase().trim();
      const cleanQ = q.replace(/[^a-z0-9]/g, '');
      const cleanCpf = (d.cpf || '').replace(/[^0-9]/g, '');

      const matchesSearch = !q || 
        d.full_name.toLowerCase().includes(q) || 
        d.cpf.includes(q) ||
        (cleanQ.length > 0 && cleanCpf.includes(cleanQ)) ||
        (d.cnh_number && d.cnh_number.toLowerCase().includes(q)) ||
        (d.department && d.department.toLowerCase().includes(q));

      const matchesDept = departmentFilter === 'all' || 
        (d.department || '').trim().toLowerCase() === departmentFilter.trim().toLowerCase() ||
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

  // Métricas do Painel de Auditoria (KPIs)
  const auditMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const suppliedOrders = orders.filter(o => o.status !== 'autorizado');
    const totalLiters = suppliedOrders.reduce((acc, o) => acc + (o.liters_supplied || 0), 0);
    const totalSpent = suppliedOrders.reduce((acc, o) => acc + (o.total_value || 0), 0);
    const anomalousOrders = orders.filter(o => o.is_anomaly || o.status === 'glosado');
    const auditedOrders = orders.filter(o => o.status === 'auditado' || o.status === 'liquidado');

    // Consumo médio ponderado
    const validConsumptionOrders = suppliedOrders.filter(o => (o.calculated_consumption || 0) > 0);
    const avgConsumption = validConsumptionOrders.length > 0
      ? (validConsumptionOrders.reduce((acc, o) => acc + (o.calculated_consumption || 0), 0) / validConsumptionOrders.length).toFixed(2)
      : '0.00';

    return {
      totalOrders,
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

      // Filtro de Secretaria
      const matchesDept = departmentFilter === 'all' || (v?.department || '').trim().toLowerCase() === departmentFilter.trim().toLowerCase();
      if (!matchesDept) return false;

      // Filtro de Status
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
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

      // Filtro de Secretaria
      const matchesDept = departmentFilter === 'all' || (v.department || '').trim().toLowerCase() === departmentFilter.trim().toLowerCase();
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
    if (cleanDoc.length === 11) {
      return drivers.find(d => d.cpf.replace(/\D/g, '') === cleanDoc) || null;
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
      const matchCpf = cleanDigits ? d.cpf.replace(/\D/g, '').includes(cleanDigits) : false;
      const matchDept = d.department.toLowerCase().includes(term);
      return matchName || matchCpf || matchDept;
    }).slice(0, 6);
  }, [drivers, driverSearchQuery, newOrderForm.driver_name]);

  const handleDriverCpfChange = (raw: string) => {
    const formatted = formatCPF(raw);
    const clean = raw.replace(/\D/g, '');
    const found = drivers.find(d => d.cpf.replace(/\D/g, '') === clean);
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
      driver_document: found ? formatCPF(found.cpf) : prev.driver_document
    }));
  };

  const handleSelectDriverQuick = (driver: FleetDriver) => {
    setNewOrderForm(prev => ({
      ...prev,
      driver_name: driver.full_name,
      driver_document: formatCPF(driver.cpf)
    }));
    setShowDriverSuggestions(false);
    setDriverSearchQuery('');
    showToast(`Condutor selecionado: ${driver.full_name}`, 'info');
  };

  // Envio de nova ordem com emissão em duas vias e parâmetros travados
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.vehicle_id) {
      showToast('Selecione um veículo da frota.', 'warning');
      return;
    }
    if (isLitersOverCapacity) {
      showToast('A litragem excede a capacidade do tanque do veículo. Operação bloqueada.', 'error');
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
        custom_order_number: newOrderForm.custom_order_number?.trim() || undefined
      });

      showToast(`Autorização ${created.order_number} emitida com sucesso! Via do Sistema registrada.`, 'success');
      setIsNewOrderModalOpen(false);
      setNewOrderStep(1);
      setNewOrderForm({
        custom_order_number: '',
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
        custom_order_number: executionForm.custom_order_number?.trim() || undefined,
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
          {/* Abas */}
          <div className="flex flex-wrap bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileText size={15} />
              <span>Ordens & Emissão</span>
            </button>

            <button
              onClick={() => setActiveTab('execution')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'execution'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Layers size={15} />
              <span>Lançamento de Canhotos</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck size={15} />
              <span>Auditoria & Semáforo</span>
              {auditMetrics.anomalousCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
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

          {/* Campainha de Notificações com Histórico e Alertas Offline */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              type="button"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              title="Central de Notificações de Frotas"
              className={`relative p-2.5 rounded-2xl transition-all cursor-pointer border flex items-center justify-center ${
                unreadNotificationsCount > 0
                  ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 shadow-sm shadow-amber-500/15'
                  : 'bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {unreadNotificationsCount > 0 ? (
                <BellRing size={20} className={bellAnimate ? 'animate-bounce text-amber-500' : 'text-amber-600 dark:text-amber-400'} />
              ) : (
                <Bell size={20} className="text-neutral-500 dark:text-neutral-400" />
              )}

              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-black text-white bg-rose-600 rounded-full shadow-md animate-pulse">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Painel Dropdown de Notificações */}
            <AnimatePresence>
              {isNotificationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-84 sm:w-96 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-50 overflow-hidden flex flex-col max-h-[85vh]"
                >
                  {/* Cabeçalho do Popover */}
                  <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-800/40">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                          Notificações da Frota
                          {unreadNotificationsCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black">
                              {unreadNotificationsCount} novas
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          Histórico completo, incluindo eventos offline
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {unreadNotificationsCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsAsRead}
                          title="Marcar todas como lidas"
                          className="p-1.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <CheckCheck size={16} />
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={clearNotificationHistory}
                          title="Limpar histórico"
                          className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtros Rápidos */}
                  <div className="flex items-center gap-1 p-2 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[11px] font-bold overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        notificationFilter === 'all'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Todas ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('unread')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        notificationFilter === 'unread'
                          ? 'bg-rose-600 text-white'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Não lidas ({unreadNotificationsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('abastecimento')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        notificationFilter === 'abastecimento'
                          ? 'bg-amber-600 text-white'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Abastecimentos
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('alerta')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        notificationFilter === 'alerta'
                          ? 'bg-rose-600 text-white'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Alertas TCE
                    </button>
                  </div>

                  {/* Lista de Notificações */}
                  <div className="overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[360px] p-1">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-10 px-4 text-center text-neutral-400">
                        <Bell size={28} className="mx-auto mb-2 opacity-40 text-neutral-400" />
                        <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Nenhuma notificação encontrada
                        </p>
                        <p className="text-[10px] mt-0.5">
                          {notificationFilter === 'unread' 
                            ? 'Todas as notificações foram lidas!' 
                            : 'Novos abastecimentos e fotos enviadas pela bomba aparecerão aqui.'}
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map(notif => {
                        const isUnread = !notif.read;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 relative group ${
                              isUnread
                                ? 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-950/50'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                            }`}
                          >
                            {/* Ícone de Destaque */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              notif.type === 'bloqueio_tce'
                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                : notif.type === 'alerta_auditoria'
                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            }`}>
                              {notif.type === 'bloqueio_tce' ? (
                                <AlertTriangle size={15} />
                              ) : notif.type === 'alerta_auditoria' ? (
                                <AlertCircle size={15} />
                              ) : (
                                <Fuel size={15} />
                              )}
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[10px] font-black text-amber-600 dark:text-amber-400 truncate">
                                  {notif.orderNumber}
                                </span>
                                <span className="text-[9px] text-neutral-400 whitespace-nowrap">
                                  {formatRelativeNotificationTime(notif.timestamp)}
                                </span>
                              </div>

                              <h5 className={`text-xs leading-snug truncate ${
                                isUnread 
                                ? 'font-black text-neutral-900 dark:text-white' 
                                : 'font-semibold text-neutral-700 dark:text-neutral-300'
                              }`}>
                                {notif.title}
                              </h5>

                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                                {notif.message}
                              </p>

                              {/* Tags de Fotos / Detalhes */}
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {notif.hasPhotos && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <Camera size={10} />
                                    Fotos Recebidas
                                  </span>
                                )}
                                {notif.plate && (
                                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                    {notif.plate}
                                  </span>
                                )}
                                {notif.liters && (
                                  <span className="text-[9px] font-bold text-neutral-400">
                                    {Number(notif.liters).toFixed(1)} L
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ponto indicador de não lida */}
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5 animate-pulse" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Rodapé Informativo */}
                  <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 text-center text-[10px] text-neutral-400">
                    Clique em qualquer notificação para abrir os comprovantes e fotos da ordem
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. KPIs de Auditoria e Conformidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Litros */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Litros Fornecidos</span>
            <Fuel size={16} className="text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
              {auditMetrics.totalLiters} <span className="text-sm font-semibold text-neutral-500">L</span>
            </h3>
            <span className="text-xs font-bold text-neutral-500">
              {auditMetrics.totalSpent}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Acumulado do exercício</p>
        </div>

        {/* Card 2: Consumo Médio da Frota */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Rendimento Médio</span>
            <Gauge size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
              {auditMetrics.avgConsumption} <span className="text-sm font-semibold text-neutral-500">km/l</span>
            </h3>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <TrendingUp size={12} className="mr-1" /> Eficiente
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Conforme metas do TCE</p>
        </div>

        {/* Card 3: Ordens Auditadas */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
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
          <p className="text-[11px] text-neutral-400 mt-1">Prontas para liquidação</p>
        </div>

        {/* Card 4: Semáforo de Anomalias (Destaque Vermelho) */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all ${
          auditMetrics.anomalousCount > 0
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
            : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'
        }`}>
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
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">Desvios de tanque ou consumo</p>
        </div>
      </div>

      {/* 3. Barra de Ações e Filtros */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Busca e Filtros */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por placa, modelo, ordem ou motorista..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full cursor-pointer"
                title="Limpar pesquisa"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as Secretarias</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            {activeTab === 'drivers' ? (
              <>
                <option value="ativo">Ativo</option>
                <option value="afastado">Afastado</option>
                <option value="inativo">Inativo</option>
              </>
            ) : activeTab === 'vehicles' ? (
              <>
                <option value="ativo">Ativo</option>
                <option value="manutencao">Em Manutenção</option>
                <option value="inativo">Inativo</option>
                <option value="baixado">Baixado</option>
              </>
            ) : (
              <>
                <option value="autorizado">Autorizado (Aguardando)</option>
                <option value="abastecido">Abastecido (Pendente Auditoria)</option>
                <option value="auditado">Auditado & Conforme</option>
                <option value="glosado">Glosado (Bloqueado)</option>
              </>
            )}
          </select>

          <button
            onClick={loadData}
            title="Recarregar dados"
            className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 rounded-xl cursor-pointer"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Botões Principais */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncPatrimonio}
            disabled={syncingPatrimonio}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-xl transition-all cursor-pointer border border-blue-200 dark:border-blue-800"
            title="Importar/Atualizar veículos cadastrados no patrimônio municipal de Torixoréu"
          >
            <RefreshCw size={14} className={syncingPatrimonio ? 'animate-spin' : ''} />
            <span>Sincronizar Patrimônio</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800"
          >
            <FileSpreadsheet size={15} />
            <span>Exportar Relatório TCE (Excel)</span>
          </button>

          <button
            onClick={() => {
              setPriceEditForm(biddedPrices);
              setIsPriceConfigModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-xl transition-all cursor-pointer border border-amber-200 dark:border-amber-800"
            title="Tabela de Preços Licitados por Combustível e Aditivos de Reequilíbrio Contratual"
          >
            <Sliders size={14} />
            <span>Preços Licitados / Reequilíbrio</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBudgetClassificationsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all cursor-pointer border border-blue-200 dark:border-blue-800"
            title="Gerenciar Fichas Orçamentárias, Centros de Custo e Créditos Especiais"
          >
            <Layers size={14} />
            <span>Fichas Orçamentárias / Créditos</span>
          </button>

          {activeTab === 'vehicles' ? (
            <button
              onClick={() => setIsNewVehicleModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Veículo</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsLegacyVoucherModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-xl hover:shadow-md transition-all cursor-pointer"
                title="Lançar ou importar abastecimentos anteriores feitos em talão ou canhoto de papel"
              >
                <FileText size={15} />
                <span>Lançar Canhoto Antigo</span>
              </button>

              <button
                onClick={() => setIsNewOrderModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl hover:shadow-lg transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Emitir Ordem Digital</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. CONTEÚDO PRINCIPAL: ABA 1 (Ordens & Emissão) */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                Ordens de Fornecimento Emitidas
              </h4>
              <p className="text-neutral-400 text-xs">Acompanhamento e impressão de autorizações oficiais</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-neutral-500">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'ordem encontrada' : 'ordens encontradas'}
              </span>
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllOrders}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all cursor-pointer border border-rose-200 dark:border-rose-900/50 shadow-sm"
                  title="Limpar todas as ordens de teste e reiniciar numeração em AUT-2026-0001"
                >
                  <Trash2 size={13} />
                  <span>Limpar Ordens</span>
                </button>
              )}
            </div>
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
                        Número da Ordem
                      </span>
                      {orderNumberSort === 'asc' ? (
                        <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-black text-[9px] bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 shadow-xs">
                          <ArrowUp size={11} />
                          <span>1 → 9</span>
                        </span>
                      ) : orderNumberSort === 'desc' ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-black text-[9px] bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 shadow-xs">
                          <ArrowDown size={11} />
                          <span>9 → 1</span>
                        </span>
                      ) : (
                        <ArrowUpDown size={11} className="text-neutral-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3.5">Veículo / Placa</th>
                  <th className="px-4 py-3.5">Secretaria</th>
                  <th className="px-4 py-3.5">Condutor</th>
                  <th className="px-4 py-3.5">Combustível</th>
                  <th className="px-4 py-3.5">Litragem Autorizada</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-neutral-400">
                      <Fuel size={36} className="mx-auto text-amber-500 mb-2 opacity-60" />
                      <p className="font-bold text-neutral-800 dark:text-white">Nenhuma ordem de abastecimento emitida ainda</p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                        A frota real de {vehicles.length} veículos municipais está pronta. Clique no botão <strong>"Emitir Ordem Digital"</strong> acima para gerar a primeira autorização oficial com trava de tanque e QR Code.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(order => {
                    const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                        {/* Número */}
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => setSearchTerm(order.order_number)}
                            title={`Filtrar apenas a ordem ${order.order_number} na pesquisa`}
                            className="font-mono font-bold text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer text-left transition-colors"
                          >
                            {order.order_number}
                          </button>
                          {(order as any).is_legacy_voucher || order.supply_mode === 'canhoto_legado' ? (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title={(order as any).notes || 'Canhoto físico antigo'}>
                              📑 {(order as any).voucher_number || 'Canhoto Antigo'}
                            </span>
                          ) : order.is_full_tank_order ? (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              🚨 Tanque Cheio (Prontidão)
                            </span>
                          ) : null}
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </td>

                        {/* Veículo */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <MercosulPlate plate={v?.plate} size="xs" />
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {v?.model || 'Veículo Municipal'}
                            </span>
                            {v?.is_emergency_priority && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                🚨 24h
                              </span>
                            )}
                          </div>
                          {v?.prefix_code && (
                            <span className="text-[10px] text-neutral-400 ml-0.5">
                              Prefixo: {v.prefix_code}
                            </span>
                          )}
                        </td>

                        {/* Secretaria & Ficha Orçamentária */}
                        <td className="px-4 py-3.5">
                          <div className="text-neutral-700 dark:text-neutral-300 font-medium">
                            {v?.department || '-'}
                          </div>
                          {(() => {
                            const activeBc = resolveOrderBudget(order, v, budgetClassifications);
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenBudgetModal(order)}
                                title="Clique para editar / alterar a ficha orçamentária"
                                className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer transition-colors"
                              >
                                <Layers size={10} className="text-amber-600" />
                                <span>{activeBc?.invoice_sheet ? `Ficha ${activeBc.invoice_sheet}` : 'Definir Ficha'}</span>
                              </button>
                            );
                          })()}
                        </td>

                        {/* Motorista */}
                        <td className="px-4 py-3.5">
                          <div className="text-neutral-900 dark:text-white font-semibold">
                            {order.driver_name}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {order.driver_document || 'Sem documento'}
                          </div>
                        </td>

                        {/* Combustível */}
                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            {order.fuel_type.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Litros Autorizados */}
                        <td className="px-4 py-3.5">
                          {order.supply_mode === 'encher_tanque' || order.is_full_tank_order ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                                ⛽ Completar Tanque
                              </span>
                              <span className="text-[10px] text-neutral-400 block">
                                Teto: {v?.tank_capacity.toFixed(0) || order.liters_authorized.toFixed(0)} L (Top-Off)
                              </span>
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block">
                                Valor a apurar na bomba
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-neutral-900 dark:text-white font-bold">
                                {order.liters_authorized.toFixed(2)} L
                              </span>
                              <span className="text-[10px] text-neutral-400 block">
                                Tanque: {v?.tank_capacity.toFixed(0)} L
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {(order.status === 'autorizado' || order.status === 'autorizado_pendente') && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Aguardando Abastecimento
                            </span>
                          )}
                          {order.status === 'abastecido' && (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Abastecido no Posto
                              </span>
                              {order.anomaly_level === 'alerta_amarelo' && (
                                <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                  ⚠️ Desvio moderado
                                </span>
                              )}
                            </div>
                          )}
                          {order.status === 'auditado' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <CheckCircle2 size={11} />
                              Auditado & Homologado
                            </span>
                          )}
                          {order.status === 'glosado' && (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                                <Ban size={11} />
                                Glosado (Bloqueio)
                              </span>
                              {order.anomaly_level === 'bloqueio_critico' && (
                                <span className="block text-[9px] font-black text-rose-600 dark:text-rose-400">
                                  🔴 Bloqueio Crítico TCE
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => imprimirCanhotoDuasVias(order as any, v)}
                              title="Imprimir Canhoto em Duas Vias (A4 Oficial com QR Code)"
                              className="flex items-center gap-1 px-2 py-1 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              <Printer size={13} />
                              <span className="hidden sm:inline">2 Vias</span>
                            </button>

                            {(order.status === 'autorizado' || order.status === 'autorizado_pendente') && (
                              <button
                                onClick={() => handleOpenExecution(order)}
                                title="Preencher Leitura do Odômetro e Baixar Ordem"
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <Gauge size={12} />
                                <span>Odômetro</span>
                              </button>
                            )}

                            {order.status === 'abastecido' && (
                              <button
                                onClick={() => handleOpenExecution(order)}
                                title="Corrigir Odômetro ou Litros do Abastecimento"
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <Edit2 size={12} />
                                <span>Editar</span>
                              </button>
                            )}

                            {order.status === 'auditado' && (
                              <>
                                <button
                                  onClick={() => handleCancelHomologation(order)}
                                  title="Cancelar Homologação para permitir editar ou corrigir erros"
                                  className="px-2 py-1 text-[10px] font-bold text-rose-700 hover:text-rose-900 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-800 shadow-xs"
                                >
                                  <RotateCcw size={11} className="text-rose-600 dark:text-rose-400" />
                                  <span>Cancelar Homologação</span>
                                </button>
                                <button
                                  onClick={() => handleOpenExecution(order)}
                                  title="Editar ordem homologada (reabre para edição)"
                                  className="px-2 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <Edit2 size={12} />
                                  <span>Editar</span>
                                </button>
                              </>
                            )}

                            {order.status === 'glosado' && (
                              <button
                                onClick={() => handleCancelHomologation(order)}
                                title="Cancelar Glosa e Reabrir Ordem para Edição"
                                className="px-2 py-1 text-[10px] font-bold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-neutral-300 dark:border-neutral-700 shadow-xs"
                              >
                                <RotateCcw size={11} />
                                <span>Reabrir</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenBudgetModal(order)}
                              title="Editar / Alterar Dotação Orçamentária"
                              className="flex items-center gap-1 px-2 py-1 text-amber-800 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border border-amber-200/70 dark:border-amber-900/40 shadow-sm"
                            >
                              <Layers size={12} className="text-amber-600 dark:text-amber-400" />
                              <span>Dotação</span>
                            </button>

                            {(order.status === 'abastecido' || order.status === 'auditado' || order.status === 'glosado' || order.receipt_photo_url || order.receipt_attachment_url || order.odometer_photo_url || order.pump_photo_url) && (
                              <button
                                onClick={() => openAttachmentViewer(order)}
                                title="Ver Fotos do Abastecimento (Bomba e Odômetro)"
                                className="px-2 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] font-bold"
                              >
                                <Eye size={14} />
                                {order.pump_photo_url && (
                                  <Camera size={13} className="text-amber-500" title="Foto da Bomba Recebida" />
                                )}
                                {order.odometer_photo_url && (
                                  <Gauge size={13} className="text-blue-500" title="Foto do Odômetro Recebida" />
                                )}
                                {(order.receipt_photo_url || order.receipt_attachment_url) && (
                                  <FileCheck size={13} className="text-emerald-500" title="Canhoto Anexado" />
                                )}
                                <span>Fotos</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteOrder(order)}
                              title="Excluir Ordem / Auditoria"
                              className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
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
                      const deltaOdo = order.current_odometer && order.previous_odometer 
                        ? order.current_odometer - order.previous_odometer 
                        : 0;

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
                            {order.total_value ? (
                              <div className="text-[10px] text-neutral-500 font-mono">
                                Total: {order.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                            ) : (order.supply_mode === 'encher_tanque' || order.is_full_tank_order) ? (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                Valor a apurar na bomba
                              </div>
                            ) : null}
                          </td>

                          {/* Odômetro */}
                          <td className="px-4 py-3.5 font-mono">
                            <div>Atual: <strong>{order.current_odometer}</strong></div>
                            <div className="text-[10px] text-neutral-400">Ant.: {order.previous_odometer}</div>
                            {deltaOdo > 0 && (
                              <span className="text-[10px] font-bold text-emerald-600">
                                +{deltaOdo} {v?.metric_type} rodados
                              </span>
                            )}
                          </td>

                          {/* Consumo */}
                          <td className="px-4 py-3.5">
                            {(order.calculated_consumption || order.calculated_km_per_liter) ? (
                              <div>
                                <span className="font-black text-xs text-neutral-900 dark:text-white">
                                  {Number(order.calculated_consumption ?? order.calculated_km_per_liter ?? 0).toFixed(2)} km/l
                                </span>
                                <span className="text-[10px] text-neutral-400 block">
                                  Ref.: {v?.expected_consumption?.toFixed(2) || '—'}
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
                          ? 'A frota municipal está limpa. Clique em "Cadastrar Veículo" para adicionar os veículos da frota ou sincronize do patrimônio municipal.'
                          : 'Tente alterar os termos da pesquisa ou os filtros de secretaria/status acima.'}
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setIsNewVehicleModalOpen(true)}
                          className="px-4 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} /> Cadastrar Novo Veículo
                        </button>
                        <button
                          onClick={handleSyncPatrimonio}
                          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={14} /> Sincronizar do Patrimônio
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
                        {driver.cpf}
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
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full p-6 overflow-hidden"
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
                                setNewOrderForm(prev => ({
                                  ...prev,
                                  vehicle_id: v.id,
                                  fuel_type: v.fuel_type,
                                  current_odometer: v.current_odometer || 0,
                                  budget_classification_id: v.budget_classification_id || prev.budget_classification_id || '',
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
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
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
                        className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <span>Avançar: Condutor & Posto</span>
                        <ArrowRight size={14} />
                      </button>
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
                            value={drivers.find(d => d.cpf.replace(/\D/g, '') === newOrderForm.driver_document.replace(/\D/g, ''))?.id || ''}
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
                                {d.full_name} • CPF: {formatCPF(d.cpf)} ({d.department})
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
                                    {formatCPF(drv.cpf)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Campo CPF com Máscara e Detecção Instantânea */}
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            CPF do Condutor *
                          </label>
                          <input
                            type="text"
                            maxLength={14}
                            placeholder="000.000.000-00"
                            value={newOrderForm.driver_document}
                            onChange={e => handleDriverCpfChange(e.target.value)}
                            required
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

                    {/* NÚMERO PERSONALIZADO DA AUTORIZAÇÃO (SEGUIR TALÃO DE PAPEL) */}
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <FileText size={13} className="text-amber-600 dark:text-amber-400" />
                          Número da Autorização / Requisição (Opcional - talão físico)
                        </label>
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                          Deixe em branco para numeração automática
                        </span>
                      </div>
                      <input
                        type="text"
                        value={newOrderForm.custom_order_number}
                        onChange={e => setNewOrderForm({ ...newOrderForm, custom_order_number: e.target.value.toUpperCase() })}
                        placeholder="Ex: REQ-0412, 1024, AUT-2026-0005"
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
                        disabled={isLitersOverCapacity || !newOrderForm.vehicle_id || !newOrderForm.driver_name}
                        className={`px-5 py-2.5 text-xs font-black text-white rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                          isLitersOverCapacity 
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
                        executionForm.current_odometer <= selectedOrderForAction.previous_odometer
                          ? 'border-rose-500 text-rose-600 focus:ring-rose-500'
                          : 'border-neutral-200 dark:border-neutral-700 focus:ring-emerald-500'
                      }`}
                    />
                    <span className="text-[10px] text-neutral-400">
                      Anterior: {formatThousands(selectedOrderForAction.previous_odometer)} km
                    </span>
                  </div>
                </div>

                {/* PAINEL MATEMÁTICO DE AUDITORIA EM TEMPO REAL (ANTIFRAUDE) */}
                {(() => {
                  const v = selectedOrderForAction.vehicle || vehicles.find(item => item.id === selectedOrderForAction.vehicle_id);
                  const deltaOdo = executionForm.current_odometer > selectedOrderForAction.previous_odometer
                    ? executionForm.current_odometer - selectedOrderForAction.previous_odometer
                    : 0;
                  const expectedLiters = (v && v.expected_consumption > 0 && deltaOdo > 0)
                    ? (deltaOdo / v.expected_consumption)
                    : 0;
                  const maxAllowed = expectedLiters * 1.30;
                  const isEmergencyOrFullTank = selectedOrderForAction.is_full_tank_order || v?.is_emergency_priority;
                  const excessLiters = executionForm.liters_supplied - maxAllowed;
                  const isExcess = isEmergencyOrFullTank && deltaOdo > 0 && expectedLiters > 0 && executionForm.liters_supplied > maxAllowed && excessLiters > 8.0;
                  const isStagnant = deltaOdo < 15 && executionForm.liters_supplied > 10;

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

      {/* MODAL 3: AUDITORIA E GLOSA (CONTROLE INTERNO) */}
      <AnimatePresence>
        {isAuditModalOpen && selectedOrderForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    auditForm.status === 'glosado' ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {auditForm.status === 'glosado' ? <Ban size={20} /> : <ShieldCheck size={20} />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      {auditForm.status === 'glosado' ? 'Glosar Pagamento do Fornecimento' : 'Homologar & Liberar para Liquidação'}
                    </h3>
                    <p className="text-neutral-400 text-xs">Decisão formal do fiscal do contrato e auditoria</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAudit} className="mt-4 space-y-4">
                {selectedOrderForAction.is_anomaly && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-xs text-rose-800 dark:text-rose-300">
                    <strong>Motivo da Inconsistência Detectada:</strong>
                    <p className="mt-0.5">{selectedOrderForAction.anomaly_reason}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Decisão Técnica do Controle Interno *
                  </label>
                  <select
                    value={auditForm.status}
                    onChange={e => setAuditForm({ ...auditForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="auditado">Homologado (Aprovado sem restrições para liquidação)</option>
                    <option value="glosado">Glosado (Pagamento bloqueado pelo Controle Interno)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Justificativa / Parecer do Auditor *
                  </label>
                  <textarea
                    rows={4}
                    value={auditForm.justification}
                    onChange={e => setAuditForm({ ...auditForm, justification: e.target.value })}
                    required
                    placeholder="Descreva a fundamentação técnica do deferimento ou a base legal da glosa da despesa..."
                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsAuditModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                      auditForm.status === 'glosado' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    Confirmar Decisão
                  </button>
                </div>
              </form>
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
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Secretaria / Lotação *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Saúde, Educação, Obras..."
                      value={newVehicleForm.department}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, department: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none"
                    />
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
                        <strong className="font-mono text-xs">{viewingAttachmentOrder.previous_odometer} km</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-400 block text-[10px] font-bold">Odômetro Atual Lido:</span>
                        <strong className="font-mono text-xs text-blue-600 dark:text-blue-400">{viewingAttachmentOrder.current_odometer || '—'} km</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-400 block text-[10px] font-bold">Litragem Faturada:</span>
                        <strong className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          {Number(viewingAttachmentOrder.liters_supplied || viewingAttachmentOrder.liters_authorized).toFixed(2)} L
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-neutral-400 block text-[10px] font-bold">Consumo Apurado:</span>
                        <strong className="font-mono text-xs">
                          {viewingAttachmentOrder.calculated_km_per_liter || viewingAttachmentOrder.calculated_consumption || '—'} km/l
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
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Secretaria / Lotação *
                    </label>
                    <input
                      type="text"
                      value={editVehicleForm.department}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, department: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none"
                    />
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
                      CPF *
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={driverForm.cpf}
                      onChange={e => setDriverForm({ ...driverForm, cpf: formatCPF(e.target.value) })}
                      required
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
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Secretaria de Lotação *
                    </label>
                    <select
                      value={driverForm.department}
                      onChange={e => setDriverForm({ ...driverForm, department: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
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

      {/* IMPORTADOR EM LOTE DE MOTORISTAS (.XLSX / .CSV) */}
      <DriverBatchImporter
        isOpen={isDriverBatchModalOpen}
        onClose={() => setIsDriverBatchModalOpen(false)}
        onSuccess={(count) => {
          showToast(`${count} motoristas importados com sucesso!`, 'success');
          loadData();
        }}
        institutionId={currentUser?.institution_id}
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

