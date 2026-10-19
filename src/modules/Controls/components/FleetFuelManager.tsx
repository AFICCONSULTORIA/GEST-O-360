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
  Car
} from 'lucide-react';
import {
  FleetVehicle,
  FuelSupplyOrder,
  FuelType,
  MetricType,
  getFleetVehicles,
  getFuelSupplyOrders,
  createFuelOrder,
  registerFuelExecution,
  uploadReceiptAttachment,
  auditFuelOrder,
  createFleetVehicle
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
  const [activeTab, setActiveTab] = useState<'orders' | 'execution' | 'audit' | 'vehicles'>('orders');

  // Dados
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [orders, setOrders] = useState<FuelSupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  // Carregar dados
  const loadData = async () => {
    setLoading(true);
    try {
      const [vehList, ordList] = await Promise.all([
        getFleetVehicles(),
        getFuelSupplyOrders()
      ]);
      setVehicles(vehList);
      setOrders(ordList);
    } catch (err) {
      console.error('Erro ao carregar dados de frotas:', err);
      showToast('Erro ao carregar dados do módulo de frotas.', 'error');
    } finally {
      setLoading(false);
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
    const list = Array.from(new Set(vehicles.map(v => v.department).filter(Boolean)));
    return list.sort();
  }, [vehicles]);

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
                    <td colSpan={8} className="text-center py-10 text-neutral-400">
                      Nenhuma ordem de abastecimento encontrada com os filtros selecionados.
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
            <button
              onClick={() => setIsNewVehicleModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl cursor-pointer"
            >
              <Plus size={14} /> Cadastrar Veículo
            </button>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                {vehicles.map(vehicle => (
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
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 size={10} /> Ativo
                      </span>
                    </td>
                  </tr>
                ))}
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
                {/* Seleção do Veículo */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Veículo Oficial da Frota *
                  </label>
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
                    <option value="">Selecione a placa / modelo do veículo...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.plate} - {v.model} ({v.department}) [Tanque: {v.tank_capacity}L]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exibição Técnica do Veículo Selecionado */}
                {selectedVehicleForNewOrder && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1">
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

                {/* Condutor e Matrícula */}
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
                      CPF ou Matrícula Funcional
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 849.201.554-00"
                      value={newOrderForm.driver_document}
                      onChange={e => setNewOrderForm({ ...newOrderForm, driver_document: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Posto e Combustível */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Posto Conveniado Credenciado *
                    </label>
                    <input
                      type="text"
                      value={newOrderForm.station_name}
                      onChange={e => setNewOrderForm({ ...newOrderForm, station_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
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
    </div>
  );
};
