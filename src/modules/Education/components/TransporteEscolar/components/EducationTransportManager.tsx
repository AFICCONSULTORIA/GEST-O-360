import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bus,
  ExternalLink,
  MapPin,
  Navigation,
  Plus,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Smartphone,
  Users,
} from 'lucide-react';
import { showToast } from '../../../../../components/ui/Toast';
import { transportService } from '../services/transportService';
import type {
  SchoolAttendanceRecord,
  SchoolBus,
  SchoolRoute,
  SchoolStop,
  SchoolTransportStudent,
  SchoolTrip,
  TransportShift,
} from '../types';
import { LiveBusMap } from './LiveBusMap';
import { MonitorBusApp } from './MonitorBusApp';

interface EducationTransportManagerProps {
  institutionId?: string;
  currentUserName?: string;
}

type TransportSubTab = 'realtime' | 'monitor' | 'routes' | 'fleet' | 'students';

export const EducationTransportManager: React.FC<EducationTransportManagerProps> = ({
  institutionId = 'inst_1',
  currentUserName,
}) => {
  const [subTab, setSubTab] = useState<TransportSubTab>('realtime');
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<SchoolBus[]>([]);
  const [routes, setRoutes] = useState<SchoolRoute[]>([]);
  const [stops, setStops] = useState<SchoolStop[]>([]);
  const [students, setStudents] = useState<SchoolTransportStudent[]>([]);
  const [trips, setTrips] = useState<SchoolTrip[]>([]);
  const [attendance, setAttendance] = useState<SchoolAttendanceRecord[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Forms state
  const [showBusForm, setShowBusForm] = useState(false);
  const [busForm, setBusForm] = useState({
    prefix: '',
    plate: '',
    model: '',
    capacity: 44,
    driver_name: '',
    driver_phone: '',
    monitor_name: '',
    tracker_device_id: '',
  });

  const [showRouteForm, setShowRouteForm] = useState(false);
  const [routeForm, setRouteForm] = useState({
    name: '',
    code: '',
    shift: 'manha' as TransportShift,
    school_name: '',
    bus_id: '',
    departure_time: '06:30',
    arrival_time: '07:20',
  });

  const [selectedRouteForStops, setSelectedRouteForStops] = useState<string>('');
  const [stopForm, setStopForm] = useState({
    name: '',
    reference_note: '',
    estimated_time: '06:40',
    is_rural: true,
    lat: '',
    lng: '',
  });

  const [showStudentForm, setShowStudentForm] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentForm, setStudentForm] = useState({
    student_name: '',
    student_cpf: '',
    guardian_name: '',
    guardian_cpf: '',
    guardian_phone: '',
    birth_date: '',
    school_name: '',
    route_id: '',
    stop_id: '',
    shift: 'manha' as TransportShift,
    uses_outbound: true,
    uses_inbound: true,
  });

  const refreshData = useCallback(async () => {
    const data = await transportService.loadAll(institutionId);
    setBuses(data.buses);
    setRoutes(data.routes);
    setStops(data.stops);
    setStudents(data.students);
    setTrips(data.trips);
    setAttendance(data.attendance);
    if (!selectedRouteForStops && data.routes[0]?.id) {
      setSelectedRouteForStops(data.routes[0].id);
    }
    setLoading(false);
  }, [institutionId, selectedRouteForStops]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Simulador de rastreador GPS para testes antes da compra dos aparelhos
  useEffect(() => {
    if (!simulating) return;
    const onlineBus = buses.find((b) => b.tracker_device_id) || buses[0];
    if (!onlineBus || !onlineBus.tracker_device_id) return;

    const interval = setInterval(async () => {
      const baseLat = onlineBus.last_lat ?? -16.6789;
      const baseLng = onlineBus.last_lng ?? -49.2552;
      const deltaLat = (Math.random() - 0.45) * 0.0018;
      const deltaLng = (Math.random() - 0.45) * 0.0018;
      const speed = Math.round(28 + Math.random() * 24);
      await transportService.ingestTrackerTelemetry(
        institutionId,
        onlineBus.tracker_device_id!,
        Number((baseLat + deltaLat).toFixed(6)),
        Number((baseLng + deltaLng).toFixed(6)),
        speed,
        true
      );
      await refreshData();
    }, 3500);

    return () => clearInterval(interval);
  }, [simulating, buses, institutionId, refreshData]);

  const activeTrips = useMemo(() => trips.filter((t) => t.status === 'em_andamento'), [trips]);
  const totalOnboard = useMemo(
    () =>
      attendance.filter(
        (a) => a.status === 'embarcou' && activeTrips.some((t) => t.id === a.trip_id)
      ).length,
    [attendance, activeTrips]
  );
  const onlineTrackers = useMemo(
    () => buses.filter((b) => b.tracker_status === 'online' || b.tracker_status === 'simulado').length,
    [buses]
  );

  const selectedBus = buses.find((b) => b.id === selectedBusId) || buses[0] || null;
  const selectedBusRoute = routes.find((r) => r.bus_id === selectedBus?.id);
  const selectedBusStops = stops.filter((s) => s.route_id === selectedBusRoute?.id);

  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busForm.prefix || !busForm.plate || !busForm.driver_name) return;
    await transportService.saveBus(institutionId, {
      ...busForm,
      tracker_status: busForm.tracker_device_id ? 'offline' : 'offline',
      status: 'ativo',
    });
    setBusForm({
      prefix: '',
      plate: '',
      model: '',
      capacity: 44,
      driver_name: '',
      driver_phone: '',
      monitor_name: '',
      tracker_device_id: '',
    });
    setShowBusForm(false);
    showToast('Ônibus cadastrado na frota escolar!', 'success');
    await refreshData();
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.name || !routeForm.code || !routeForm.school_name) return;
    const saved = await transportService.saveRoute(institutionId, {
      ...routeForm,
      direction: 'ida_volta',
      bus_id: routeForm.bus_id || null,
      status: 'ativa',
    });
    setSelectedRouteForStops(saved.id);
    setRouteForm({
      name: '',
      code: '',
      shift: 'manha',
      school_name: '',
      bus_id: '',
      departure_time: '06:30',
      arrival_time: '07:20',
    });
    setShowRouteForm(false);
    showToast('Rota escolar criada!', 'success');
    await refreshData();
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteForStops || !stopForm.name) return;
    const existingCount = stops.filter((s) => s.route_id === selectedRouteForStops).length;
    await transportService.saveStop(institutionId, {
      route_id: selectedRouteForStops,
      name: stopForm.name,
      reference_note: stopForm.reference_note,
      order_index: existingCount + 1,
      estimated_time: stopForm.estimated_time,
      is_rural: stopForm.is_rural,
      lat: stopForm.lat ? Number(stopForm.lat) : null,
      lng: stopForm.lng ? Number(stopForm.lng) : null,
    });
    setStopForm({ name: '', reference_note: '', estimated_time: '06:40', is_rural: true, lat: '', lng: '' });
    showToast('Ponto de referência adicionado à rota!', 'success');
    await refreshData();
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.student_name || !studentForm.birth_date || !studentForm.route_id) return;
    await transportService.saveStudent(institutionId, {
      ...studentForm,
      stop_id: studentForm.stop_id || null,
      active: true,
    });
    setStudentForm({
      student_name: '',
      student_cpf: '',
      guardian_name: '',
      guardian_cpf: '',
      guardian_phone: '',
      birth_date: '',
      school_name: '',
      route_id: '',
      stop_id: '',
      shift: 'manha',
      uses_outbound: true,
      uses_inbound: true,
    });
    setShowStudentForm(false);
    showToast('Aluno vinculado ao transporte escolar!', 'success');
    await refreshData();
  };

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      !q ||
      s.student_name.toLowerCase().includes(q) ||
      (s.guardian_name || '').toLowerCase().includes(q) ||
      s.school_name.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-10 border border-neutral-100 dark:border-neutral-800 flex items-center justify-center gap-3 text-neutral-500">
        <RefreshCw className="animate-spin" size={20} />
        <span className="text-sm font-bold">Carregando central de Transporte Escolar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior de Ações e Sub-navegação */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'realtime', label: 'Mapa & Tempo Real', icon: Radio },
              { id: 'monitor', label: 'Chamada do Monitor', icon: Smartphone },
              { id: 'routes', label: 'Rotas & Pontos', icon: RouteIcon },
              { id: 'fleet', label: 'Frota & Rastreadores', icon: Bus },
              { id: 'students', label: 'Alunos Vinculados', icon: Users },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                subTab === item.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSimulating((s) => !s)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border cursor-pointer transition-all ${
              simulating
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
            }`}
            title="Simula pacotes GPS do rastreador para testar o mapa ao vivo"
          >
            <Navigation size={14} className={simulating ? 'animate-pulse text-emerald-600' : ''} />
            {simulating ? 'Simulador GPS Ativo' : 'Simular Rastreador GPS'}
          </button>

          <a
            href="/transporte"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black flex items-center gap-2 hover:opacity-90"
          >
            <ExternalLink size={14} />
            Portal dos Pais (/transporte)
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Viagens Ativas</p>
          <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{activeTrips.length}</p>
          <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <Activity size={13} /> Em circulação agora
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Alunos a Bordo</p>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalOnboard}</p>
          <p className="text-xs text-neutral-500 mt-1">De {students.length} cadastrados</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Rastreadores GPS</p>
          <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">
            {onlineTrackers}/{buses.length}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Frota 100% própria</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Rotas & Pontos</p>
          <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{routes.length}</p>
          <p className="text-xs text-neutral-500 mt-1">{stops.length} pontos de referência</p>
        </div>
      </div>

      {/* SUB-ABA 1: TEMPO REAL & MAPA */}
      {subTab === 'realtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Localização da Frota Escolar em Tempo Real
                </h3>
                <p className="text-xs text-neutral-500">
                  Clique em um ônibus no mapa para ver a rota e os pontos de parada.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshData}
                className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                title="Atualizar posições"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            <LiveBusMap
              buses={buses}
              stops={selectedBusStops}
              selectedBusId={selectedBus?.id}
              onSelectBus={(id) => setSelectedBusId(id)}
              heightClass="h-[430px]"
            />
          </div>

          <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              Ônibus & Viagens de Hoje
            </h3>

            <div className="space-y-3">
              {buses.map((bus) => {
                const route = routes.find((r) => r.bus_id === bus.id);
                const trip = trips.find((t) => t.bus_id === bus.id && t.status === 'em_andamento');
                const onboard = trip
                  ? attendance.filter((a) => a.trip_id === trip.id && a.status === 'embarcou').length
                  : 0;
                const isSelected = selectedBus?.id === bus.id;

                return (
                  <button
                    key={bus.id}
                    type="button"
                    onClick={() => setSelectedBusId(bus.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                        : 'border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-neutral-900 dark:text-white">
                        {bus.prefix} • {bus.plate}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          bus.tracker_status === 'online' || bus.tracker_status === 'simulado'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        {bus.tracker_status === 'online' ? 'GPS Online' : 'Sem Sinal'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 truncate">
                      {route ? `${route.code} — ${route.name}` : 'Sem rota vinculada'}
                    </p>
                    <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                      <span>Motorista: {bus.driver_name}</span>
                      {trip ? (
                        <span className="text-indigo-600 dark:text-indigo-400">{onboard} a bordo</span>
                      ) : (
                        <span>Estacionado</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: MONITOR ESCOLAR */}
      {subTab === 'monitor' && (
        <MonitorBusApp
          institutionId={institutionId}
          routes={routes}
          buses={buses}
          stops={stops}
          students={students}
          trips={trips}
          attendance={attendance}
          monitorDefaultName={currentUserName}
          onRefresh={refreshData}
        />
      )}

      {/* SUB-ABA 3: ROTAS & PONTOS DE REFERÊNCIA */}
      {subTab === 'routes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">Rotas Cadastradas</h3>
              <button
                type="button"
                onClick={() => setShowRouteForm((v) => !v)}
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Nova Rota
              </button>
            </div>

            {showRouteForm && (
              <form onSubmit={handleSaveRoute} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    required
                    placeholder="Código (R-03)"
                    value={routeForm.code}
                    onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                  />
                  <input
                    required
                    placeholder="Nome da Linha / Rota"
                    value={routeForm.name}
                    onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                    className="col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Escola de Destino"
                    value={routeForm.school_name}
                    onChange={(e) => setRouteForm({ ...routeForm, school_name: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                  />
                  <select
                    value={routeForm.bus_id}
                    onChange={(e) => setRouteForm({ ...routeForm, bus_id: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                  >
                    <option value="">Vincular Ônibus...</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.prefix} ({b.plate})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={routeForm.shift}
                    onChange={(e) => setRouteForm({ ...routeForm, shift: e.target.value as TransportShift })}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                  >
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                    <option value="integral">Integral</option>
                  </select>
                  <input
                    type="time"
                    value={routeForm.departure_time}
                    onChange={(e) => setRouteForm({ ...routeForm, departure_time: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                  />
                  <input
                    type="time"
                    value={routeForm.arrival_time}
                    onChange={(e) => setRouteForm({ ...routeForm, arrival_time: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer"
                >
                  Salvar Rota
                </button>
              </form>
            )}

            <div className="space-y-2.5">
              {routes.map((route) => {
                const bus = buses.find((b) => b.id === route.bus_id);
                const stopCount = stops.filter((s) => s.route_id === route.id).length;
                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => setSelectedRouteForStops(route.id)}
                    className={`w-full text-left p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedRouteForStops === route.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                        : 'border-neutral-100 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-neutral-900 dark:text-white">
                        {route.code} — {route.name}
                      </span>
                      <span className="text-[11px] font-bold uppercase text-indigo-600">{route.shift}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {route.school_name} • {route.departure_time} → {route.arrival_time} •{' '}
                      {bus ? bus.prefix : 'Sem ônibus'} • {stopCount} ponto(s)
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              Pontos de Referência da Rota
            </h3>

            <form onSubmit={handleAddStop} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <input
                  required
                  placeholder="Nome do ponto (ex: Porteira Faz. X)"
                  value={stopForm.name}
                  onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                  className="col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                />
                <input
                  type="time"
                  value={stopForm.estimated_time}
                  onChange={(e) => setStopForm({ ...stopForm, estimated_time: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                />
              </div>
              <input
                placeholder="Referência visual (ex: Ao lado da caixa d'água)"
                value={stopForm.reference_note}
                onChange={(e) => setStopForm({ ...stopForm, reference_note: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude (clique no mapa abaixo)"
                  value={stopForm.lat}
                  onChange={(e) => setStopForm({ ...stopForm, lat: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-mono"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude (clique no mapa abaixo)"
                  value={stopForm.lng}
                  onChange={(e) => setStopForm({ ...stopForm, lng: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-mono"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={stopForm.is_rural}
                    onChange={(e) => setStopForm({ ...stopForm, is_rural: e.target.checked })}
                  />
                  Zona Rural (capturar GPS em campo pelo monitor)
                </label>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer"
                >
                  Adicionar Ponto
                </button>
              </div>
            </form>

            <LiveBusMap
              buses={buses}
              stops={stops.filter((s) => s.route_id === selectedRouteForStops)}
              pickedCoordinate={
                stopForm.lat && stopForm.lng
                  ? { lat: Number(stopForm.lat), lng: Number(stopForm.lng) }
                  : null
              }
              onPickCoordinate={(lat, lng) =>
                setStopForm((prev) => ({
                  ...prev,
                  lat: String(lat),
                  lng: String(lng),
                }))
              }
              heightClass="h-[260px]"
              initialZoom={14}
            />

            <div className="space-y-2">
              {stops
                .filter((s) => s.route_id === selectedRouteForStops)
                .sort((a, b) => a.order_index - b.order_index)
                .map((stop) => (
                  <div
                    key={stop.id}
                    className="p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
                        {stop.order_index}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">{stop.name}</p>
                        <p className="text-[11px] text-neutral-500">
                          {stop.estimated_time || '--:--'} {stop.reference_note ? `• ${stop.reference_note}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
                      <MapPin size={12} />
                      {stop.lat != null ? `${stop.lat.toFixed(4)}, ${stop.lng?.toFixed(4)}` : 'GPS pendente'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 4: FROTA & RASTREADORES */}
      {subTab === 'fleet' && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                Ônibus Próprios & Rastreadores GPS
              </h3>
              <p className="text-xs text-neutral-500">
                Quando os rastreadores chegarem, configure o webhook/RPC{' '}
                <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">
                  ingest_bus_tracker_telemetry
                </code>{' '}
                apontando o ID do equipamento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBusForm((v) => !v)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Cadastrar Ônibus
            </button>
          </div>

          {showBusForm && (
            <form onSubmit={handleSaveBus} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                required
                placeholder="Prefixo (ONB-03)"
                value={busForm.prefix}
                onChange={(e) => setBusForm({ ...busForm, prefix: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                required
                placeholder="Placa (ABC-1D23)"
                value={busForm.plate}
                onChange={(e) => setBusForm({ ...busForm, plate: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                required
                placeholder="Modelo (Volare / Iveco)"
                value={busForm.model}
                onChange={(e) => setBusForm({ ...busForm, model: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                type="number"
                placeholder="Capacidade"
                value={busForm.capacity}
                onChange={(e) => setBusForm({ ...busForm, capacity: Number(e.target.value) })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                required
                placeholder="Nome do Motorista"
                value={busForm.driver_name}
                onChange={(e) => setBusForm({ ...busForm, driver_name: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                placeholder="Nome do Monitor Escolar"
                value={busForm.monitor_name}
                onChange={(e) => setBusForm({ ...busForm, monitor_name: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                placeholder="ID do Rastreador (IMEI / Serial)"
                value={busForm.tracker_device_id}
                onChange={(e) => setBusForm({ ...busForm, tracker_device_id: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer"
              >
                Salvar Ônibus
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buses.map((bus) => (
              <div
                key={bus.id}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                      {bus.prefix} • {bus.plate}
                    </h4>
                    <p className="text-xs text-neutral-500">
                      {bus.model} ({bus.capacity} lugares)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono font-bold text-neutral-600 dark:text-neutral-300">
                    {bus.tracker_device_id || 'Sem rastreador'}
                  </span>
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span>Motorista: <strong>{bus.driver_name}</strong></span>
                  <span>Monitor: <strong>{bus.monitor_name || 'Não definido'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA 5: ALUNOS VINCULADOS */}
      {subTab === 'students' && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Buscar aluno, responsável ou escola..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowStudentForm((v) => !v)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Vincular Aluno ao Transporte
            </button>
          </div>

          {showStudentForm && (
            <form onSubmit={handleSaveStudent} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                placeholder="Nome completo do aluno"
                value={studentForm.student_name}
                onChange={(e) => setStudentForm({ ...studentForm, student_name: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                required
                type="date"
                title="Data de nascimento do aluno"
                value={studentForm.birth_date}
                onChange={(e) => setStudentForm({ ...studentForm, birth_date: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                placeholder="CPF do Aluno (opcional)"
                value={studentForm.student_cpf}
                onChange={(e) => setStudentForm({ ...studentForm, student_cpf: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                placeholder="Nome do Responsável"
                value={studentForm.guardian_name}
                onChange={(e) => setStudentForm({ ...studentForm, guardian_name: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                placeholder="CPF do Responsável (para acesso dos pais)"
                value={studentForm.guardian_cpf}
                onChange={(e) => setStudentForm({ ...studentForm, guardian_cpf: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <input
                required
                placeholder="Escola"
                value={studentForm.school_name}
                onChange={(e) => setStudentForm({ ...studentForm, school_name: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
              <select
                required
                value={studentForm.route_id}
                onChange={(e) => setStudentForm({ ...studentForm, route_id: e.target.value, stop_id: '' })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              >
                <option value="">Selecione a Rota...</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
              <select
                value={studentForm.stop_id}
                onChange={(e) => setStudentForm({ ...studentForm, stop_id: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              >
                <option value="">Selecione o Ponto de Referência...</option>
                {stops
                  .filter((s) => s.route_id === studentForm.route_id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.order_index}. {s.name}
                    </option>
                  ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer"
              >
                Salvar Aluno
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 uppercase font-black">
                  <th className="py-3 pr-4">Aluno</th>
                  <th className="py-3 pr-4">Responsável / CPF</th>
                  <th className="py-3 pr-4">Rota & Ponto de Referência</th>
                  <th className="py-3">Escola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredStudents.map((s) => {
                  const route = routes.find((r) => r.id === s.route_id);
                  const stop = stops.find((st) => st.id === s.stop_id);
                  return (
                    <tr key={s.id}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-neutral-900 dark:text-white">{s.student_name}</p>
                        <p className="text-[11px] text-neutral-400">Nasc.: {s.birth_date}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {s.guardian_name || '—'}
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {s.guardian_cpf || s.student_cpf || 'Sem CPF'}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {route ? `${route.code} — ${route.name}` : '—'}
                        </p>
                        <p className="text-[11px] text-neutral-500">{stop?.name || 'Ponto não definido'}</p>
                      </td>
                      <td className="py-3 font-semibold text-neutral-700 dark:text-neutral-300">
                        {s.school_name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
