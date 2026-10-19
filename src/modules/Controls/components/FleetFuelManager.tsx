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
  CreditCard
} from 'lucide-react';
import {
  FleetVehicle,
  FuelSupplyOrder,
  FuelType,
  MetricType,
  FleetDriver,
  FleetFuelStation,
  getFleetVehicles,
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
  getFleetFuelStations,
  createFleetFuelStation,
  updateFleetFuelStation,
  deleteFleetFuelStation
} from '../../../lib/api/fleetFuel';
import { imprimirOrdemAbastecimento } from './OrdemAbastecimentoPDF';
import { exportToExcel } from '../../../lib/excelExport';
import { showToast } from '../../../components/ui/Toast';
import { AdminUser } from '../../../types';

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
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driverSearchTerm, setDriverSearchTerm] = useState('');
  const [stationSearchTerm, setStationSearchTerm] = useState('');

  // Modais
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<FuelSupplyOrder | null>(null);
  const [viewingAttachmentOrder, setViewingAttachmentOrder] = useState<FuelSupplyOrder | null>(null);

  // Formulário: Nova Ordem
  const [newOrderForm, setNewOrderForm] = useState({
    vehicle_id: '',
    driver_name: '',
    driver_document: '',
    station_name: 'Auto Posto Central Municipal Ltda',
    fuel_type: 'diesel_s10' as FuelType,
    liters_authorized: 50
  });

  // Formulário: Lançamento de Canhoto / Execução
  const [executionForm, setExecutionForm] = useState({
    liters_supplied: 0,
    current_odometer: 0,
    unit_price: 6.19,
    invoice_number: '',
    invoice_key: '',
    receipt_attachment_url: '',
    odometer_photo_url: '',
    invoice_attachment_url: ''
  });

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
    current_odometer: 0
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
    status: 'ativo' as 'ativo' | 'manutencao' | 'baixado' | 'inativo'
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

  // Carregar dados reais (Veículos, Ordens, Motoristas e Postos)
  const loadData = async () => {
    setLoading(true);
    try {
      const instId = currentUser?.institution_id || 'inst_1';
      const [vehList, ordList, drvList, staList] = await Promise.all([
        getFleetVehicles(undefined, instId),
        getFuelSupplyOrders({ institutionId: instId }),
        getFleetDrivers({ institutionId: instId }),
        getFleetFuelStations({ institutionId: instId })
      ]);
      setVehicles(vehList);
      setOrders(ordList);
      setDrivers(drvList);
      setStations(staList);
    } catch (err) {
      console.error('Erro ao carregar dados de frotas:', err);
      showToast('Erro ao carregar dados do módulo de frotas.', 'error');
    } finally {
      setLoading(false);
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
      status: vehicle.status
    });
    setIsEditVehicleModalOpen(true);
  };

  const handleSaveEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    try {
      await updateFleetVehicle(editingVehicle.id, {
        plate: editVehicleForm.plate.toUpperCase().trim(),
        prefix_code: editVehicleForm.prefix_code.toUpperCase().trim() || undefined,
        model: editVehicleForm.model.trim(),
        department: editVehicleForm.department.trim(),
        fuel_type: editVehicleForm.fuel_type,
        tank_capacity: Number(editVehicleForm.tank_capacity),
        metric_type: editVehicleForm.metric_type,
        expected_consumption: Number(editVehicleForm.expected_consumption),
        current_odometer: Number(editVehicleForm.current_odometer),
        status: editVehicleForm.status
      });

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
    if (!confirm(`Deseja realmente excluir a ordem de abastecimento ${order.order_number}? Esta operação é definitiva para controle interno.`)) {
      return;
    }
    try {
      await deleteFuelSupplyOrder(order.id);
      showToast(`Ordem ${order.order_number} excluída com sucesso!`, 'success');
      loadData();
    } catch (err) {
      showToast('Erro ao excluir ordem.', 'error');
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
    if (!confirm(`Deseja realmente remover o condutor ${driver.full_name} (CPF: ${driver.cpf})?`)) {
      return;
    }
    try {
      await deleteFleetDriver(driver.id);
      showToast(`Motorista ${driver.full_name} removido com sucesso!`, 'success');
      loadData();
    } catch (err) {
      showToast('Erro ao remover motorista.', 'error');
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
    if (!confirm(`Deseja realmente remover o posto conveniado ${station.name}?`)) {
      return;
    }
    try {
      await deleteFleetFuelStation(station.id);
      showToast(`Posto ${station.name} removido com sucesso!`, 'success');
      loadData();
    } catch (err) {
      showToast('Erro ao remover posto credenciado.', 'error');
    }
  };

  useEffect(() => {
    loadData();
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
      const q = driverSearchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        d.full_name.toLowerCase().includes(q) || 
        d.cpf.includes(q) ||
        (d.cnh_number && d.cnh_number.includes(q));
      const matchesDept = departmentFilter === 'all' || d.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [drivers, driverSearchTerm, departmentFilter]);

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

  // Filtragem de ordens
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v?.plate && v.plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v?.model && v.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.station_name && order.station_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDept = departmentFilter === 'all' || v?.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [orders, vehicles, searchTerm, departmentFilter, statusFilter]);

  // Abertura do modal de execução com pré-preenchimento
  const handleOpenExecution = (order: FuelSupplyOrder) => {
    const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
    setSelectedOrderForAction(order);
    setExecutionForm({
      liters_supplied: order.liters_supplied || order.liters_authorized,
      current_odometer: order.current_odometer && order.current_odometer > order.previous_odometer 
        ? order.current_odometer 
        : order.previous_odometer + 150,
      unit_price: order.unit_price || 6.19,
      invoice_number: order.invoice_number || '',
      invoice_key: order.invoice_key || '',
      receipt_attachment_url: order.receipt_attachment_url || '',
      odometer_photo_url: order.odometer_photo_url || '',
      invoice_attachment_url: order.invoice_attachment_url || ''
    });
    setIsExecutionModalOpen(true);
  };

  // Envio de nova ordem
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
      const created = await createFuelOrder({
        vehicle_id: newOrderForm.vehicle_id,
        driver_name: newOrderForm.driver_name,
        driver_document: newOrderForm.driver_document,
        station_name: newOrderForm.station_name,
        fuel_type: newOrderForm.fuel_type,
        liters_authorized: Number(newOrderForm.liters_authorized)
      });

      showToast(`Ordem ${created.order_number} emitida com sucesso!`, 'success');
      setIsNewOrderModalOpen(false);
      setNewOrderForm({
        vehicle_id: '',
        driver_name: '',
        driver_document: '',
        station_name: 'Auto Posto Central Municipal Ltda',
        fuel_type: 'diesel_s10',
        liters_authorized: 50
      });
      loadData();

      // Pergunta se deseja imprimir agora
      if (confirm(`Deseja imprimir a Ordem Oficial ${created.order_number} agora?`)) {
        imprimirOrdemAbastecimento(created, created.vehicle || selectedVehicleForNewOrder);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao emitir ordem.', 'error');
    }
  };

  // Envio de execução / baixa de canhoto
  const handleSaveExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForAction) return;

    try {
      const updated = await registerFuelExecution(selectedOrderForAction.id, {
        liters_supplied: Number(executionForm.liters_supplied),
        current_odometer: Number(executionForm.current_odometer),
        unit_price: Number(executionForm.unit_price),
        invoice_number: executionForm.invoice_number,
        invoice_key: executionForm.invoice_key,
        receipt_attachment_url: executionForm.receipt_attachment_url,
        odometer_photo_url: executionForm.odometer_photo_url,
        invoice_attachment_url: executionForm.invoice_attachment_url
      });

      if (updated.is_anomaly) {
        showToast(`Abastecimento registrado com ALERTA DE ANOMALIA: ${updated.anomaly_reason}`, 'warning');
      } else {
        showToast('Abastecimento registrado com sucesso e sem anomalias!', 'success');
      }

      setIsExecutionModalOpen(false);
      setSelectedOrderForAction(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar execução.', 'error');
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
      await createFleetVehicle({
        institution_id: currentUser?.institution_id || 'default',
        plate: newVehicleForm.plate.toUpperCase().trim(),
        prefix_code: newVehicleForm.prefix_code.toUpperCase().trim() || undefined,
        model: newVehicleForm.model.trim(),
        department: newVehicleForm.department,
        fuel_type: newVehicleForm.fuel_type,
        tank_capacity: Number(newVehicleForm.tank_capacity),
        metric_type: newVehicleForm.metric_type,
        expected_consumption: Number(newVehicleForm.expected_consumption),
        current_odometer: Number(newVehicleForm.current_odometer),
        status: 'ativo'
      });

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
        current_odometer: 0
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
    type: 'receipt' | 'odometer' | 'invoice'
  ) => {
    try {
      showToast('Enviando comprovante...', 'info');
      const url = await uploadReceiptAttachment(orderId, file, type);
      showToast('Comprovante anexado com sucesso!', 'success');
      setExecutionForm(prev => {
        if (type === 'receipt') return { ...prev, receipt_attachment_url: url };
        if (type === 'odometer') return { ...prev, odometer_photo_url: url };
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
        'Litros Autorizados',
        'Litros Abastecidos',
        'Métrica',
        'Leitura Anterior',
        'Leitura no Ato',
        'Consumo Apurado',
        'Consumo Esperado',
        'Preço Unitário (R$)',
        'Valor Total (R$)',
        'Número NF/Cupom',
        'Status de Liquidação',
        'Anomalia Detectada',
        'Motivo da Anomalia',
        'Parecer do Controle Interno'
      ];

      const data = orders.map(ord => {
        const v = ord.vehicle || vehicles.find(item => item.id === ord.vehicle_id);
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
          'Litros Autorizados': ord.liters_authorized,
          'Litros Abastecidos': ord.liters_supplied || 'Aguardando',
          'Métrica': v?.metric_type === 'horimetro' ? 'Horímetro (h)' : 'Odômetro (km)',
          'Leitura Anterior': ord.previous_odometer,
          'Leitura no Ato': ord.current_odometer || '-',
          'Consumo Apurado': ord.calculated_consumption ? `${ord.calculated_consumption} ${v?.metric_type === 'horimetro' ? 'l/h' : 'km/l'}` : '-',
          'Consumo Esperado': v?.expected_consumption ? `${v.expected_consumption} ${v?.metric_type === 'horimetro' ? 'l/h' : 'km/l'}` : '-',
          'Preço Unitário (R$)': ord.unit_price ? `R$ ${ord.unit_price.toFixed(3)}` : '-',
          'Valor Total (R$)': ord.total_value ? `R$ ${ord.total_value.toFixed(2)}` : '-',
          'Número NF/Cupom': ord.invoice_number || '-',
          'Status de Liquidação': ord.status.toUpperCase(),
          'Anomalia Detectada': ord.is_anomaly ? 'SIM (RISCO DE GLOSA)' : 'NÃO (CONFORME)',
          'Motivo da Anomalia': ord.anomaly_reason || '-',
          'Parecer do Controle Interno': ord.audit_justification || '-'
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

        {/* Abas */}
        <div className="flex flex-wrap bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1 w-full lg:w-auto">
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
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
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
            <option value="autorizado">Autorizado (Aguardando)</option>
            <option value="abastecido">Abastecido (Pendente Auditoria)</option>
            <option value="auditado">Auditado & Conforme</option>
            <option value="glosado">Glosado (Bloqueado)</option>
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

          {activeTab === 'vehicles' ? (
            <button
              onClick={() => setIsNewVehicleModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Veículo</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Emitir Ordem Digital</span>
            </button>
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
            <span className="text-xs font-bold text-neutral-500">
              {filteredOrders.length} ordens encontradas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3.5">Número da Ordem</th>
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
                  filteredOrders.map(order => {
                    const v = order.vehicle || vehicles.find(item => item.id === order.vehicle_id);
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                        {/* Número */}
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-neutral-900 dark:text-white">
                            {order.order_number}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </td>

                        {/* Veículo */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                              {v?.plate || 'SEM PLACA'}
                            </span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {v?.model || 'Veículo Municipal'}
                            </span>
                          </div>
                          {v?.prefix_code && (
                            <span className="text-[10px] text-neutral-400 ml-0.5">
                              Prefixo: {v.prefix_code}
                            </span>
                          )}
                        </td>

                        {/* Secretaria */}
                        <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                          {v?.department || '-'}
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
                          <span className="text-neutral-900 dark:text-white font-bold">
                            {order.liters_authorized.toFixed(2)} L
                          </span>
                          <span className="text-[10px] text-neutral-400 block">
                            Tanque: {v?.tank_capacity.toFixed(0)} L
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {order.status === 'autorizado' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Aguardando Abastecimento
                            </span>
                          )}
                          {order.status === 'abastecido' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              Abastecido (Pendente)
                            </span>
                          )}
                          {order.status === 'auditado' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <CheckCircle2 size={11} />
                              Auditado & Homologado
                            </span>
                          )}
                          {order.status === 'glosado' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                              <Ban size={11} />
                              Glosado (Suspenso)
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => imprimirOrdemAbastecimento(order, v)}
                              title="Imprimir Ordem Oficial (PDF)"
                              className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer size={15} />
                            </button>

                            {order.status === 'autorizado' && (
                              <button
                                onClick={() => handleOpenExecution(order)}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                              >
                                Lançar Canhoto
                              </button>
                            )}

                            {(order.receipt_attachment_url || order.odometer_photo_url || order.invoice_attachment_url) && (
                              <button
                                onClick={() => setViewingAttachmentOrder(order)}
                                title="Ver Comprovantes Anexados"
                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye size={15} />
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
        </div>
      )}

      {/* 5. CONTEÚDO PRINCIPAL: ABA 2 (Lançamento de Canhotos & Baixa) */}
      {activeTab === 'execution' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <strong className="block font-bold mb-0.5">Rotina Obrigatória de Liquidação de Despesa (Lei 4.320/64)</strong>
              Todas as ordens autorizadas devem ter o canhoto físico assinado pelo condutor e frentista digitalizado, conferência de KM e inserção da Nota Fiscal para validação pelo Controle Interno.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.filter(o => o.status === 'autorizado').length === 0 ? (
              <div className="col-span-full bg-white dark:bg-neutral-900 p-12 text-center rounded-3xl border border-neutral-100 dark:border-neutral-800 text-neutral-400">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-bold text-neutral-800 dark:text-white">Todas as ordens emitidas já foram liquidadas ou lançadas!</p>
                <p className="text-xs mt-1">Nenhuma autorização pendente de abastecimento no momento.</p>
              </div>
            ) : (
              orders.filter(o => o.status === 'autorizado').map(order => {
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
                      <p className="text-xs text-neutral-500 mb-3">
                        Placa: <strong className="text-neutral-900 dark:text-white">{v?.plate}</strong> • Prefixo: {v?.prefix_code || '-'}
                      </p>

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
                          <span className="font-mono">{order.previous_odometer} {v?.metric_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        onClick={() => imprimirOrdemAbastecimento(order, v)}
                        className="flex-1 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Printer size={14} />
                        Reimprimir
                      </button>

                      <button
                        onClick={() => handleOpenExecution(order)}
                        className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Upload size={14} />
                        Baixar Canhoto
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
                    filteredOrders.map(order => {
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
                            <div className="font-mono font-bold text-neutral-900 dark:text-white">
                              {v?.plate || 'SEM PLACA'}
                            </div>
                            <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                              {v?.model}
                            </div>
                            <div className="text-[10px] text-neutral-400">
                              {v?.department} • {order.order_number}
                            </div>
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
                              <span className="text-neutral-400 font-normal">/ {order.liters_authorized.toFixed(0)} L</span>
                            </div>
                            {order.total_value && (
                              <div className="text-[10px] text-neutral-500 font-mono">
                                Total: {order.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                            )}
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
                            {order.calculated_consumption ? (
                              <div>
                                <span className="font-black text-xs text-neutral-900 dark:text-white">
                                  {order.calculated_consumption.toFixed(2)} {v?.metric_type === 'horimetro' ? 'l/h' : 'km/l'}
                                </span>
                                <span className="text-[10px] text-neutral-400 block">
                                  Ref.: {v?.expected_consumption.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[10px]">Aguardando cálculo</span>
                            )}
                          </td>

                          {/* Comprovantes */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {order.receipt_attachment_url ? (
                                <button
                                  onClick={() => setViewingAttachmentOrder(order)}
                                  className="p-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:scale-105 transition-transform"
                                  title="Canhoto Assinado Anexado"
                                >
                                  <FileCheck size={14} />
                                </button>
                              ) : (
                                <span className="text-neutral-300 dark:text-neutral-700" title="Sem canhoto">
                                  <FileText size={14} />
                                </span>
                              )}

                              {order.invoice_number ? (
                                <span 
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                  title={`NF: ${order.invoice_number}`}
                                >
                                  NF
                                </span>
                              ) : null}

                              <button
                                onClick={() => setViewingAttachmentOrder(order)}
                                className="text-blue-600 hover:text-blue-800 text-[11px] font-bold underline ml-1 cursor-pointer"
                              >
                                Abrir
                              </button>
                            </div>
                          </td>

                          {/* Semáforo / Anomalia */}
                          <td className="px-4 py-3.5 max-w-[220px]">
                            {order.is_anomaly ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-rose-600 text-white animate-pulse">
                                  <AlertTriangle size={11} />
                                  Anomalia Grave
                                </span>
                                <div className="text-[10px] font-medium text-rose-700 dark:text-rose-300 leading-tight">
                                  {order.anomaly_reason}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <CheckCircle2 size={11} />
                                Conforme
                              </span>
                            )}
                          </td>

                          {/* Decisão Auditor */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.status === 'glosado' ? (
                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                  Glosado
                                </span>
                              ) : order.status === 'auditado' ? (
                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  Homologado
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedOrderForAction(order);
                                      setAuditForm({
                                        status: 'auditado',
                                        justification: 'Documentação física, odômetro e notas fiscais conferidas em conformidade.'
                                      });
                                      setIsAuditModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Aprovar
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSelectedOrderForAction(order);
                                      setAuditForm({
                                        status: 'glosado',
                                        justification: order.anomaly_reason || 'Glosa preventiva de liquidação de despesa por inconsistência de dados.'
                                      });
                                      setIsAuditModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Glosar
                                  </button>
                                </>
                              )}

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
          </div>
        </div>
      )}

      {/* 7. CONTEÚDO PRINCIPAL: ABA 4 (Gestão da Frota & Veículos) */}
      {activeTab === 'vehicles' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                Cadastro Técnico de Veículos e Máquinas Pesadas
              </h4>
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
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-neutral-400">
                      <Truck size={36} className="mx-auto text-neutral-400 mb-2 opacity-60" />
                      <p className="font-bold text-neutral-800 dark:text-white">Nenhum veículo cadastrado na frota</p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                        A frota municipal está limpa. Clique em <strong>"Cadastrar Veículo"</strong> para adicionar os veículos da frota ou sincronize do patrimônio municipal.
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
                  vehicles.map(vehicle => (
                    <tr key={vehicle.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                          {vehicle.plate}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-neutral-700 dark:text-neutral-300">
                        {vehicle.prefix_code || '-'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                        {vehicle.model}
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
                        {vehicle.expected_consumption.toFixed(2)} {vehicle.metric_type === 'horimetro' ? 'l/h' : 'km/l'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-800 dark:text-neutral-200">
                        {vehicle.current_odometer.toLocaleString('pt-BR')} {vehicle.metric_type}
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
                  placeholder="Buscar motorista ou CPF..."
                  value={driverSearchTerm}
                  onChange={e => setDriverSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none"
                />
              </div>
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
                      <p className="font-bold text-neutral-800 dark:text-white">Nenhum motorista cadastrado ainda</p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                        Cadastre os condutores oficiais com Nome Completo, CPF, Data de Nascimento e Secretaria para emissão ágil de ordens.
                      </p>
                      <button
                        onClick={handleOpenNewDriver}
                        className="mt-4 px-4 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} /> Cadastrar Primeiro Motorista
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map(driver => (
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
                  filteredStations.map(station => (
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
        </div>
      )}

      {/* MODAL 1: EMISSÃO DE NOVA ORDEM DIGITAL COM BLOQUEIO DE TANQUE */}
      <AnimatePresence>
        {isNewOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-xl w-full p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Fuel size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Emitir Ordem de Abastecimento
                    </h3>
                    <p className="text-neutral-400 text-xs">Geração com QR Code validador e trava de tanque</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
                {/* Seleção do Veículo pela Placa */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Veículo Oficial da Frota (Buscar pela Placa) *
                    </label>
                    {vehicles.length === 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        Nenhum veículo cadastrado
                      </span>
                    )}
                  </div>
                  <select
                    value={newOrderForm.vehicle_id}
                    onChange={e => {
                      const vehId = e.target.value;
                      const found = vehicles.find(v => v.id === vehId);
                      setNewOrderForm(prev => ({
                        ...prev,
                        vehicle_id: vehId,
                        fuel_type: found ? found.fuel_type : prev.fuel_type,
                        liters_authorized: found ? Math.min(prev.liters_authorized, found.tank_capacity) : prev.liters_authorized
                      }));
                    }}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Selecione a placa do veículo...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.plate} — {v.model} ({v.department}) [Tanque: {v.tank_capacity}L]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exibição Técnica do Veículo Selecionado */}
                {selectedVehicleForNewOrder && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Modelo e Secretaria:</span>
                      <strong className="text-neutral-900 dark:text-white">{selectedVehicleForNewOrder.model} ({selectedVehicleForNewOrder.department})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Capacidade Máxima do Tanque:</span>
                      <strong className="text-neutral-900 dark:text-white">{selectedVehicleForNewOrder.tank_capacity.toFixed(2)} Litros</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Última Leitura ({selectedVehicleForNewOrder.metric_type}):</span>
                      <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{selectedVehicleForNewOrder.current_odometer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Consumo de Referência:</span>
                      <span className="font-semibold text-emerald-600">{selectedVehicleForNewOrder.expected_consumption} {selectedVehicleForNewOrder.metric_type === 'horimetro' ? 'l/h' : 'km/l'}</span>
                    </div>
                  </div>
                )}

                {/* Litros Autorizados & Validação de Tanque */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Litragem Autorizada (Litros) *
                    </label>
                    {selectedVehicleForNewOrder && (
                      <span className="text-[10px] text-neutral-400">
                        Limite do Tanque: {selectedVehicleForNewOrder.tank_capacity} L
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={newOrderForm.liters_authorized}
                    onChange={e => setNewOrderForm({ ...newOrderForm, liters_authorized: parseFloat(e.target.value) || 0 })}
                    required
                    className={`w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ${
                      isLitersOverCapacity 
                        ? 'border-rose-500 text-rose-600 focus:ring-rose-500 bg-rose-50/30' 
                        : 'border-neutral-200 dark:border-neutral-700 focus:ring-amber-500 text-neutral-900 dark:text-white'
                    }`}
                  />

                  {/* ALERTA VISUAL DE TRAVA DE TANQUE */}
                  {isLitersOverCapacity && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs"
                    >
                      <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>BLOQUEIO ANTIFRAUDE DO TCE:</strong> A litragem autorizada ({newOrderForm.liters_authorized}L) é maior que a capacidade física do tanque do veículo ({selectedVehicleForNewOrder?.tank_capacity}L). Reduza a quantidade para prosseguir.
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Condutor e CPF com autopreenchimento de Motorista Cadastrado */}
                <div className="space-y-2">
                  {drivers.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                        Puxar Motorista Cadastrado (Nome ou CPF)
                      </label>
                      <select
                        onChange={e => {
                          const drvId = e.target.value;
                          const found = drivers.find(d => d.id === drvId);
                          if (found) {
                            setNewOrderForm(prev => ({
                              ...prev,
                              driver_name: found.full_name,
                              driver_document: found.cpf
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Selecione o motorista para preencher Nome e CPF...</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.full_name} — CPF: {d.cpf} ({d.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Nome do Condutor / Motorista *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Carlos Alberto Ferreira"
                        value={newOrderForm.driver_name}
                        onChange={e => setNewOrderForm({ ...newOrderForm, driver_name: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        CPF do Motorista *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 849.201.554-00"
                        value={newOrderForm.driver_document}
                        onChange={e => setNewOrderForm({ ...newOrderForm, driver_document: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Posto e Combustível */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Posto Conveniado Credenciado *
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
                        placeholder="Ex: Auto Posto Central Municipal"
                        value={newOrderForm.station_name}
                        onChange={e => setNewOrderForm({ ...newOrderForm, station_name: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Combustível Homologado
                    </label>
                    <select
                      value={newOrderForm.fuel_type}
                      onChange={e => setNewOrderForm({ ...newOrderForm, fuel_type: e.target.value as FuelType })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="diesel_s10">Diesel S-10</option>
                      <option value="diesel_s500">Diesel S-500</option>
                      <option value="gasolina">Gasolina Comum</option>
                      <option value="etanol">Etanol Hidratado</option>
                      <option value="arla32">Arla 32</option>
                    </select>
                  </div>
                </div>

                {/* Botões do Rodapé do Modal */}
                <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsNewOrderModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLitersOverCapacity}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      isLitersOverCapacity 
                        ? 'bg-neutral-400 cursor-not-allowed opacity-60' 
                        : 'bg-amber-600 hover:bg-amber-700 shadow-md'
                    }`}
                  >
                    <CheckSquare size={14} />
                    Confirmar & Gerar Ordem
                  </button>
                </div>
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
                    Lançamento de Canhoto & Baixa de Abastecimento
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

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Preço Unitário (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={executionForm.unit_price}
                      onChange={e => setExecutionForm({ ...executionForm, unit_price: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-emerald-600 font-bold">
                      Total: R$ {(executionForm.liters_supplied * executionForm.unit_price).toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Leitura Atual (KM/H) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={executionForm.current_odometer}
                      onChange={e => setExecutionForm({ ...executionForm, current_odometer: parseFloat(e.target.value) || 0 })}
                      required
                      className={`w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ${
                        executionForm.current_odometer <= selectedOrderForAction.previous_odometer
                          ? 'border-rose-500 text-rose-600 focus:ring-rose-500'
                          : 'border-neutral-200 dark:border-neutral-700 focus:ring-emerald-500'
                      }`}
                    />
                    <span className="text-[10px] text-neutral-400">
                      Anterior: {selectedOrderForAction.previous_odometer}
                    </span>
                  </div>
                </div>

                {/* Nota Fiscal e Chave de Acesso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Número da Nota / Cupom Fiscal *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: NF-e 004821 ou NFC-e 1198"
                      value={executionForm.invoice_number}
                      onChange={e => setExecutionForm({ ...executionForm, invoice_number: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Chave de Acesso da NF-e (44 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={44}
                      placeholder="Ex: 51260403849201000155550010000048211928374821"
                      value={executionForm.invoice_key}
                      onChange={e => setExecutionForm({ ...executionForm, invoice_key: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* SEÇÃO DE UPLOAD DOS 3 ANEXOS OBRIGATÓRIOS */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300">
                    Anexos Comprobatórios (Canhoto, Bomba e Nota Fiscal)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Anexo 1: Canhoto Assinado */}
                    <div className="border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-center">
                      <span className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                        1. Canhoto Assinado *
                      </span>
                      {executionForm.receipt_attachment_url ? (
                        <div className="space-y-1">
                          <img
                            src={executionForm.receipt_attachment_url}
                            alt="Canhoto"
                            className="w-full h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                          />
                          <span className="text-[10px] text-emerald-600 font-bold block">✓ Anexado</span>
                        </div>
                      ) : (
                        <div className="h-20 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex flex-col items-center justify-center p-2 text-neutral-400">
                          <Upload size={18} />
                          <span className="text-[10px] mt-1">Carregar foto</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(selectedOrderForAction.id, file, 'receipt');
                        }}
                        className="mt-2 text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-900 file:text-white dark:file:bg-white dark:file:text-neutral-950 cursor-pointer"
                      />
                    </div>

                    {/* Anexo 2: Foto do Painel / Odômetro */}
                    <div className="border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-center">
                      <span className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                        2. Foto do Painel/Bomba
                      </span>
                      {executionForm.odometer_photo_url ? (
                        <div className="space-y-1">
                          <img
                            src={executionForm.odometer_photo_url}
                            alt="Painel"
                            className="w-full h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                          />
                          <span className="text-[10px] text-emerald-600 font-bold block">✓ Anexado</span>
                        </div>
                      ) : (
                        <div className="h-20 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex flex-col items-center justify-center p-2 text-neutral-400">
                          <Gauge size={18} />
                          <span className="text-[10px] mt-1">Painel no ato</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(selectedOrderForAction.id, file, 'odometer');
                        }}
                        className="mt-2 text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-900 file:text-white dark:file:bg-white dark:file:text-neutral-950 cursor-pointer"
                      />
                    </div>

                    {/* Anexo 3: Cupom / Nota Fiscal */}
                    <div className="border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-center">
                      <span className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                        3. Cupom / NF-e
                      </span>
                      {executionForm.invoice_attachment_url ? (
                        <div className="space-y-1">
                          <img
                            src={executionForm.invoice_attachment_url}
                            alt="Nota Fiscal"
                            className="w-full h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                          />
                          <span className="text-[10px] text-emerald-600 font-bold block">✓ Anexado</span>
                        </div>
                      ) : (
                        <div className="h-20 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex flex-col items-center justify-center p-2 text-neutral-400">
                          <FileText size={18} />
                          <span className="text-[10px] mt-1">PDF/Foto da NF</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(selectedOrderForAction.id, file, 'invoice');
                        }}
                        className="mt-2 text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-900 file:text-white dark:file:bg-white dark:file:text-neutral-950 cursor-pointer"
                      />
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
                    Validar & Finalizar Abastecimento
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
                    <select
                      value={newVehicleForm.metric_type}
                      onChange={e => setNewVehicleForm({ ...newVehicleForm, metric_type: e.target.value as MetricType })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="km">Odômetro (KM)</option>
                      <option value="horimetro">Horímetro (Horas)</option>
                    </select>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* 1. Canhoto */}
                <div className="space-y-2">
                  <h5 className="font-bold text-xs text-neutral-700 dark:text-neutral-300 uppercase">
                    1. Canhoto Assinado
                  </h5>
                  {viewingAttachmentOrder.receipt_attachment_url ? (
                    <a
                      href={viewingAttachmentOrder.receipt_attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block group overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 relative"
                    >
                      <img
                        src={viewingAttachmentOrder.receipt_attachment_url}
                        alt="Canhoto"
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        Ampliar Imagem ↗
                      </div>
                    </a>
                  ) : (
                    <div className="h-56 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-neutral-400 text-xs">
                      Não anexado
                    </div>
                  )}
                </div>

                {/* 2. Painel / Odômetro */}
                <div className="space-y-2">
                  <h5 className="font-bold text-xs text-neutral-700 dark:text-neutral-300 uppercase">
                    2. Painel / Bomba
                  </h5>
                  {viewingAttachmentOrder.odometer_photo_url ? (
                    <a
                      href={viewingAttachmentOrder.odometer_photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block group overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 relative"
                    >
                      <img
                        src={viewingAttachmentOrder.odometer_photo_url}
                        alt="Painel"
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        Ampliar Imagem ↗
                      </div>
                    </a>
                  ) : (
                    <div className="h-56 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-neutral-400 text-xs">
                      Não anexado
                    </div>
                  )}
                </div>

                {/* 3. Nota Fiscal */}
                <div className="space-y-2">
                  <h5 className="font-bold text-xs text-neutral-700 dark:text-neutral-300 uppercase">
                    3. Nota Fiscal / Cupom
                  </h5>
                  {viewingAttachmentOrder.invoice_attachment_url ? (
                    <a
                      href={viewingAttachmentOrder.invoice_attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block group overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 relative"
                    >
                      <img
                        src={viewingAttachmentOrder.invoice_attachment_url}
                        alt="Nota Fiscal"
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        Ampliar Imagem ↗
                      </div>
                    </a>
                  ) : (
                    <div className="h-56 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-neutral-400 text-xs">
                      Não anexado
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-xs text-neutral-500">
                  Nota Fiscal: <strong>{viewingAttachmentOrder.invoice_number || 'Sem número'}</strong>
                </div>
                <button
                  onClick={() => setViewingAttachmentOrder(null)}
                  className="px-5 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-xl cursor-pointer"
                >
                  Fechar Visualizador
                </button>
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
                    <select
                      value={editVehicleForm.metric_type}
                      onChange={e => setEditVehicleForm({ ...editVehicleForm, metric_type: e.target.value as MetricType })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="km">Odômetro (KM)</option>
                      <option value="horimetro">Horímetro (Horas)</option>
                    </select>
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
                      Odômetro / Horímetro Atual
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
                      onChange={e => setDriverForm({ ...driverForm, cpf: e.target.value })}
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
    </div>
  );
};

