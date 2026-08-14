import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bus, Plus, Search, Filter, Edit2, Trash2, CheckCircle2, 
  AlertTriangle, Settings, TrendingDown, ChevronRight, X, 
  MapPin, User, ShieldCheck, Download, Fuel, Wrench, FileText
} from 'lucide-react';
import { showToast } from '../../../components/ui/Toast';

export interface TransportVehicle {
  id: string;
  plate: string;
  model: string;
  driver: string;
  cnh: string;
  route: string;
  zone: 'Rural' | 'Urbana' | 'Mista';
  distanceKm: number;
  studentsCount: number;
  fuelType: 'Diesel S10' | 'Gasolina' | 'Etanol';
  monthlyCost: number;
  status: 'Em Rota' | 'Disponível' | 'Manutenção' | 'Reserva';
  lastInspectionDate: string;
  insuranceValidUntil: string;
}

const DEFAULT_VEHICLES: TransportVehicle[] = [
  {
    id: '1',
    plate: 'QBC-4A12',
    model: 'VW Ônibus Escolar 44 Lugares',
    driver: 'João Ricardo de Souza',
    cnh: '048291039-4 (Cat. D)',
    route: 'Linha 01 - Assentamento Boa Vista até Polo Central',
    zone: 'Rural',
    distanceKm: 64.5,
    studentsCount: 38,
    fuelType: 'Diesel S10',
    monthlyCost: 4800,
    status: 'Em Rota',
    lastInspectionDate: '2024-04-10',
    insuranceValidUntil: '2024-12-31'
  },
  {
    id: '2',
    plate: 'RBT-8H90',
    model: 'Mercedes-Benz Sprinter Van 19 Lugares',
    driver: 'Mário Silva Albuquerque',
    cnh: '019384729-1 (Cat. D)',
    route: 'Linha 04 - Bairros Sul / Setor Aeroporto',
    zone: 'Urbana',
    distanceKm: 28.0,
    studentsCount: 18,
    fuelType: 'Diesel S10',
    monthlyCost: 2600,
    status: 'Em Rota',
    lastInspectionDate: '2024-05-02',
    insuranceValidUntil: '2024-11-30'
  },
  {
    id: '3',
    plate: 'NKA-9012',
    model: 'Iveco Daily Micro-ônibus',
    driver: 'Antônio Carlos Santos',
    cnh: '059281746-3 (Cat. D)',
    route: 'Linha 07 - Gleba Triângulo (Comunidade Rural)',
    zone: 'Rural',
    distanceKm: 52.0,
    studentsCount: 24,
    fuelType: 'Diesel S10',
    monthlyCost: 3900,
    status: 'Manutenção',
    lastInspectionDate: '2024-02-15',
    insuranceValidUntil: '2024-10-15'
  },
  {
    id: '4',
    plate: 'PXZ-3456',
    model: 'Ford Transit Escolar',
    driver: 'Luiz Alberto Mendonça',
    cnh: '083726194-8 (Cat. D)',
    route: 'Linha 02 - CMEIs & Educação Especial AEE',
    zone: 'Urbana',
    distanceKm: 22.4,
    studentsCount: 15,
    fuelType: 'Diesel S10',
    monthlyCost: 2100,
    status: 'Disponível',
    lastInspectionDate: '2024-05-12',
    insuranceValidUntil: '2025-01-20'
  },
];

export const EducationTransport: React.FC = () => {
  const [vehicles, setVehicles] = useState<TransportVehicle[]>(() => {
    const saved = localStorage.getItem('@gestao360:education_vehicles');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_VEHICLES;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);

  // Form states
  const [formPlate, setFormPlate] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formDriver, setFormDriver] = useState('');
  const [formCnh, setFormCnh] = useState('');
  const [formRoute, setFormRoute] = useState('');
  const [formZone, setFormZone] = useState<'Rural' | 'Urbana' | 'Mista'>('Rural');
  const [formDistanceKm, setFormDistanceKm] = useState<number>(30);
  const [formStudentsCount, setFormStudentsCount] = useState<number>(20);
  const [formFuelType, setFormFuelType] = useState<'Diesel S10' | 'Gasolina' | 'Etanol'>('Diesel S10');
  const [formMonthlyCost, setFormMonthlyCost] = useState<number>(3000);
  const [formStatus, setFormStatus] = useState<TransportVehicle['status']>('Em Rota');
  const [formLastInspection, setFormLastInspection] = useState('');
  const [formInsuranceValid, setFormInsuranceValid] = useState('');

  const saveVehicles = (updated: TransportVehicle[]) => {
    setVehicles(updated);
    localStorage.setItem('@gestao360:education_vehicles', JSON.stringify(updated));
  };

  const handleOpenModal = (vehicle?: TransportVehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormPlate(vehicle.plate);
      setFormModel(vehicle.model);
      setFormDriver(vehicle.driver);
      setFormCnh(vehicle.cnh);
      setFormRoute(vehicle.route);
      setFormZone(vehicle.zone);
      setFormDistanceKm(vehicle.distanceKm);
      setFormStudentsCount(vehicle.studentsCount);
      setFormFuelType(vehicle.fuelType);
      setFormMonthlyCost(vehicle.monthlyCost);
      setFormStatus(vehicle.status);
      setFormLastInspection(vehicle.lastInspectionDate);
      setFormInsuranceValid(vehicle.insuranceValidUntil);
    } else {
      setEditingVehicle(null);
      setFormPlate('');
      setFormModel('VW Ônibus Escolar');
      setFormDriver('');
      setFormCnh('');
      setFormRoute('');
      setFormZone('Rural');
      setFormDistanceKm(35);
      setFormStudentsCount(25);
      setFormFuelType('Diesel S10');
      setFormMonthlyCost(3500);
      setFormStatus('Em Rota');
      setFormLastInspection(new Date().toISOString().split('T')[0]);
      setFormInsuranceValid('2024-12-31');
    }
    setIsModalOpen(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlate.trim() || !formDriver.trim()) {
      showToast('Preencha a placa e o motorista responsável.', 'error');
      return;
    }

    if (editingVehicle) {
      const updated = vehicles.map(v => v.id === editingVehicle.id ? {
        ...v,
        plate: formPlate.toUpperCase(),
        model: formModel,
        driver: formDriver,
        cnh: formCnh,
        route: formRoute,
        zone: formZone,
        distanceKm: Number(formDistanceKm) || 0,
        studentsCount: Number(formStudentsCount) || 0,
        fuelType: formFuelType,
        monthlyCost: Number(formMonthlyCost) || 0,
        status: formStatus,
        lastInspectionDate: formLastInspection,
        insuranceValidUntil: formInsuranceValid,
      } : v);
      saveVehicles(updated);
      showToast('Veículo e rota atualizados com sucesso!', 'success');
    } else {
      const newV: TransportVehicle = {
        id: Date.now().toString(),
        plate: formPlate.toUpperCase(),
        model: formModel,
        driver: formDriver,
        cnh: formCnh,
        route: formRoute,
        zone: formZone,
        distanceKm: Number(formDistanceKm) || 0,
        studentsCount: Number(formStudentsCount) || 0,
        fuelType: formFuelType,
        monthlyCost: Number(formMonthlyCost) || 0,
        status: formStatus,
        lastInspectionDate: formLastInspection || new Date().toISOString().split('T')[0],
        insuranceValidUntil: formInsuranceValid || '2025-12-31',
      };
      saveVehicles([newV, ...vehicles]);
      showToast('Novo veículo cadastrado na frota escolar!', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteVehicle = (id: string, plate: string) => {
    if (window.confirm(`Deseja remover o veículo de placa ${plate} da frota?`)) {
      const updated = vehicles.filter(v => v.id !== id);
      saveVehicles(updated);
      showToast('Veículo removido com sucesso.', 'info');
    }
  };

  const handleRegisterInspection = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = vehicles.map(v => v.id === id ? {
      ...v,
      lastInspectionDate: today,
      status: v.status === 'Manutenção' ? ('Disponível' as const) : v.status
    } : v);
    saveVehicles(updated);
    showToast('Vistoria registrada com sucesso! Veículo homologado.', 'success');
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || v.zone === zoneFilter;
    return matchesSearch && matchesStatus && matchesZone;
  });

  const totalKmDaily = vehicles.reduce((acc, v) => acc + v.distanceKm, 0);
  const totalTransportedStudents = vehicles.reduce((acc, v) => acc + v.studentsCount, 0);
  const totalCost = vehicles.reduce((acc, v) => acc + v.monthlyCost, 0);
  const activeVehiclesCount = vehicles.filter(v => v.status === 'Em Rota').length;

  return (
    <div className="space-y-8">
      {/* Cards de Métricas do Transporte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Veículos em Operação</p>
          <h3 className="text-3xl font-black text-sky-600 dark:text-sky-400">
            {activeVehiclesCount} <span className="text-sm font-normal text-neutral-400">/ {vehicles.length} total</span>
          </h3>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} /> Atendimento 100% das Linhas
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Quilometragem Diária</p>
          <h3 className="text-3xl font-black text-neutral-900 dark:text-white">
            {totalKmDaily.toFixed(1)} <span className="text-sm font-normal text-neutral-400">KM/dia</span>
          </h3>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight mt-1">
            Média de {(totalKmDaily / (vehicles.length || 1)).toFixed(1)} KM por rota
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Alunos Atendidos</p>
          <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400">
            {totalTransportedStudents}
          </h3>
          <p className="text-[10px] text-purple-600 font-bold uppercase tracking-tight mt-1">
            Zona Rural & Educação Especial
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Custo Estimado Mensal</p>
          <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400">
            R$ {(totalCost / 1000).toFixed(1)}k
          </h3>
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight mt-1">
            Combustível & Manutenção
          </p>
        </div>
      </div>

      {/* Tabela de Frota e Rotas */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-6 sm:p-8 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50/50 dark:bg-neutral-800/30">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Bus size={20} className="text-sky-500" />
              Frota Escolar & Linhas de Transporte ({filteredVehicles.length})
            </h3>
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1">
              PNATE / SIGET · Monitoramento de motoristas, itinerários e vistorias semestrais.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => showToast('Gerando relatório completo de rotas e consumo...', 'success')}
              className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2"
            >
              <FileText size={16} /> Relatório KM
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md"
            >
              <Plus size={16} /> Novo Veículo
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Buscar placa, motorista, modelo ou linha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Todos os Status</option>
            <option value="Em Rota">Em Rota</option>
            <option value="Disponível">Disponível</option>
            <option value="Manutenção">Em Manutenção</option>
            <option value="Reserva">Reserva Técnica</option>
          </select>
          <select 
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Todas as Zonas</option>
            <option value="Rural">Zona Rural</option>
            <option value="Urbana">Zona Urbana</option>
            <option value="Mista">Zona Mista</option>
          </select>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                <th className="py-4 px-6">Veículo / Placa</th>
                <th className="py-4 px-6">Motorista / CNH</th>
                <th className="py-4 px-6">Linha & Trajeto</th>
                <th className="py-4 px-6 text-center">Extensão (KM)</th>
                <th className="py-4 px-6 text-center">Alunos</th>
                <th className="py-4 px-6">Última Vistoria</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-neutral-400 font-bold uppercase tracking-widest">
                    Nenhum veículo encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                          <Bus size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">{v.model}</p>
                          <p className="text-[10px] font-mono font-black text-sky-600 dark:text-sky-400 uppercase">{v.plate}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-bold text-neutral-900 dark:text-white">{v.driver}</p>
                      <p className="text-[10px] text-neutral-400 font-medium">{v.cnh}</p>
                    </td>

                    <td className="py-4 px-6 max-w-xs">
                      <p className="font-bold text-neutral-800 dark:text-neutral-200 line-clamp-1">{v.route}</p>
                      <span className="text-[9px] font-black uppercase text-neutral-400">{v.zone}</span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className="font-black text-neutral-900 dark:text-white">{v.distanceKm}</span>
                      <span className="text-[9px] text-neutral-400 uppercase ml-1">Km/dia</span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className="font-black text-neutral-900 dark:text-white">{v.studentsCount}</span>
                      <span className="text-[9px] text-neutral-400 uppercase ml-1">Alunos</span>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-bold text-neutral-700 dark:text-neutral-300">{v.lastInspectionDate}</p>
                      <button 
                        onClick={() => handleRegisterInspection(v.id)}
                        className="text-[9px] font-black text-sky-600 hover:underline uppercase"
                      >
                        Homologar Hoje
                      </button>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                        v.status === 'Em Rota' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        v.status === 'Disponível' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                        v.status === 'Manutenção' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {v.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenModal(v)}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteVehicle(v.id, v.plate)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-neutral-400 hover:text-rose-600 rounded-xl transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
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

      {/* Modal Adicionar / Editar Veículo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Bus className="text-sky-500" />
                  {editingVehicle ? 'Editar Veículo da Frota' : 'Cadastrar Novo Veículo / Rota'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveVehicle} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Placa do Veículo *</label>
                    <input 
                      type="text" 
                      required
                      value={formPlate}
                      onChange={(e) => setFormPlate(e.target.value)}
                      placeholder="Ex: ABC-1234 ou BRA2E19"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-mono font-bold uppercase text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Modelo / Tipo de Veículo *</label>
                    <input 
                      type="text" 
                      required
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      placeholder="Ex: VW Ônibus Escolar 44 Lugares"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Nome do Motorista *</label>
                    <input 
                      type="text" 
                      required
                      value={formDriver}
                      onChange={(e) => setFormDriver(e.target.value)}
                      placeholder="Ex: João Ricardo de Souza"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Registro CNH</label>
                    <input 
                      type="text" 
                      value={formCnh}
                      onChange={(e) => setFormCnh(e.target.value)}
                      placeholder="Ex: 019283746-5 (Cat. D)"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Nome / Descrição da Linha (Itinerário)</label>
                    <input 
                      type="text" 
                      value={formRoute}
                      onChange={(e) => setFormRoute(e.target.value)}
                      placeholder="Ex: Linha 03 - Assentamento Esperança até Escola Maria Quitéria"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Zona de Atendimento</label>
                    <select 
                      value={formZone}
                      onChange={(e) => setFormZone(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="Rural">Zona Rural</option>
                      <option value="Urbana">Zona Urbana</option>
                      <option value="Mista">Zona Mista (Rural + Urbana)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Quilometragem Diária (KM)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={formDistanceKm}
                      onChange={(e) => setFormDistanceKm(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Alunos Transportados</label>
                    <input 
                      type="number" 
                      value={formStudentsCount}
                      onChange={(e) => setFormStudentsCount(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Status Operacional</label>
                    <select 
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="Em Rota">Em Rota</option>
                      <option value="Disponível">Disponível</option>
                      <option value="Manutenção">Em Manutenção</option>
                      <option value="Reserva">Reserva Técnica</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-sky-600/20"
                  >
                    {editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
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
