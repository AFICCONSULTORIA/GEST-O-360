import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  CloudOff,
  Compass,
  LogOut,
  MapPin,
  Play,
  RefreshCw,
  ShieldAlert,
  Square,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { showToast } from '../../../../../components/ui/Toast';
import { transportService } from '../services/transportService';
import type {
  AttendanceStatus,
  SchoolAttendanceRecord,
  SchoolBus,
  SchoolRoute,
  SchoolStop,
  SchoolTransportStudent,
  SchoolTrip,
  TripDirection,
} from '../types';

interface MonitorBusAppProps {
  institutionId: string;
  routes: SchoolRoute[];
  buses: SchoolBus[];
  stops: SchoolStop[];
  students: SchoolTransportStudent[];
  trips: SchoolTrip[];
  attendance: SchoolAttendanceRecord[];
  monitorDefaultName?: string;
  onRefresh: () => Promise<void>;
}

export const MonitorBusApp: React.FC<MonitorBusAppProps> = ({
  institutionId,
  routes,
  buses,
  stops,
  students,
  trips,
  attendance,
  monitorDefaultName = 'Monitor Escolar',
  onRefresh,
}) => {
  const activeTrip = useMemo(
    () => trips.find((t) => t.status === 'em_andamento') || null,
    [trips]
  );

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    activeTrip?.route_id || routes[0]?.id || ''
  );
  const [direction, setDirection] = useState<TripDirection>(activeTrip?.direction || 'ida');
  const [busy, setBusy] = useState(false);
  const [showIncidentBox, setShowIncidentBox] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [incidentNote, setIncidentNote] = useState('');
  const [capturingStopId, setCapturingStopId] = useState<string | null>(null);

  const currentRoute = routes.find((r) => r.id === (activeTrip?.route_id || selectedRouteId));
  const currentBus = buses.find((b) => b.id === (activeTrip?.bus_id || currentRoute?.bus_id));
  const routeStops = useMemo(
    () =>
      stops
        .filter((s) => s.route_id === currentRoute?.id)
        .sort((a, b) => a.order_index - b.order_index),
    [stops, currentRoute?.id]
  );

  const routeStudents = useMemo(() => {
    if (!currentRoute) return [];
    const dir = activeTrip?.direction || direction;
    return students.filter(
      (s) =>
        s.route_id === currentRoute.id &&
        s.active &&
        (dir === 'ida' ? s.uses_outbound : s.uses_inbound)
    );
  }, [students, currentRoute, activeTrip?.direction, direction]);

  const getStudentStatus = (studentId: string): AttendanceStatus => {
    if (!activeTrip) return 'aguardando';
    const rec = attendance.find((a) => a.trip_id === activeTrip.id && a.student_id === studentId);
    return rec?.status || 'aguardando';
  };

  const onboardCount = routeStudents.filter((s) => getStudentStatus(s.id) === 'embarcou').length;
  const disembarkedCount = routeStudents.filter((s) => getStudentStatus(s.id) === 'desembarcou').length;
  const absentCount = routeStudents.filter((s) => getStudentStatus(s.id) === 'faltou').length;
  const offlinePending = transportService.getOfflinePendingCount();

  const handleStartTrip = async () => {
    if (!currentRoute) return;
    setBusy(true);
    try {
      await transportService.startTrip(
        institutionId,
        currentRoute,
        currentBus,
        direction,
        currentBus?.monitor_name || monitorDefaultName
      );
      showToast('Viagem iniciada! Chamada liberada para o monitor.', 'success');
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    setBusy(true);
    try {
      const res = await transportService.endTrip(institutionId, activeTrip.id);
      if (!res.ok) {
        showToast(res.error || 'Não foi possível encerrar a viagem.', 'error');
        return;
      }
      showToast('Viagem encerrada com segurança (0 alunos a bordo).', 'success');
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkAttendance = async (
    student: SchoolTransportStudent,
    status: AttendanceStatus
  ) => {
    if (!activeTrip) {
      showToast('Inicie a viagem antes de registrar a chamada.', 'warning');
      return;
    }

    let coords: { lat: number; lng: number } | null = null;
    if (currentBus?.last_lat != null && currentBus?.last_lng != null) {
      coords = { lat: currentBus.last_lat, lng: currentBus.last_lng };
    }

    const res = await transportService.recordAttendance(
      institutionId,
      activeTrip.id,
      student.id,
      student.stop_id,
      status,
      currentBus?.monitor_name || monitorDefaultName,
      coords
    );

    if (!res.synced) {
      showToast('Sem conexão: presença salva offline no aparelho.', 'warning');
    }
    await onRefresh();
  };

  const handleDisembarkAll = async () => {
    if (!activeTrip || onboardCount === 0) return;
    setBusy(true);
    try {
      const count = await transportService.disembarkAllOnboard(
        institutionId,
        activeTrip.id,
        currentBus?.monitor_name || monitorDefaultName
      );
      showToast(`${count} aluno(s) desembarcado(s) na escola.`, 'success');
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleCaptureStopGps = (stop: SchoolStop) => {
    if (!navigator.geolocation) {
      showToast('GPS do navegador não disponível neste aparelho.', 'error');
      return;
    }
    setCapturingStopId(stop.id);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await transportService.saveStop(institutionId, {
          ...stop,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setCapturingStopId(null);
        showToast(`Coordenada do ponto "${stop.name}" salva com sucesso!`, 'success');
        await onRefresh();
      },
      () => {
        setCapturingStopId(null);
        showToast('Não foi possível obter o GPS agora. Verifique a permissão de localização.', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveIncident = async () => {
    if (!activeTrip || !incidentNote.trim()) return;
    await transportService.reportTripIncident(institutionId, activeTrip.id, delayMinutes, incidentNote.trim());
    setShowIncidentBox(false);
    setIncidentNote('');
    showToast('Ocorrência registrada e enviada aos pais da rota.', 'success');
    await onRefresh();
  };

  const handleSyncOffline = async () => {
    const count = await transportService.syncOfflineAttendance();
    showToast(
      count > 0 ? `${count} registro(s) offline sincronizado(s)!` : 'Nenhuma pendência offline.',
      'success'
    );
    await onRefresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Cabeçalho Mobile-First do Monitor */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Bus size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                App do Monitor Escolar
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {currentBus
                  ? `${currentBus.prefix} (${currentBus.plate}) • Monitor: ${currentBus.monitor_name || monitorDefaultName}`
                  : 'Selecione uma rota para iniciar a viagem'}
              </p>
            </div>
          </div>

          {offlinePending > 0 && (
            <button
              type="button"
              onClick={handleSyncOffline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 text-xs font-bold cursor-pointer"
            >
              <CloudOff size={14} />
              {offlinePending} offline • Sincronizar
            </button>
          )}
        </div>

        {/* Seleção de Rota/Direção quando não há viagem ativa */}
        {!activeTrip ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                Rota / Linha Escolar
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-800 dark:text-neutral-100"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name} ({r.school_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                Sentido
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                {(['ida', 'volta'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDirection(dir)}
                    className={`py-2 rounded-lg text-xs font-black uppercase cursor-pointer transition-all ${
                      direction === dir
                        ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-white shadow-sm'
                        : 'text-neutral-500'
                    }`}
                  >
                    {dir === 'ida' ? 'Ida' : 'Volta'}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-3 pt-1">
              <button
                type="button"
                disabled={busy || !currentRoute}
                onClick={handleStartTrip}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Play size={18} />
                INICIAR VIAGEM ({direction === 'ida' ? 'CASA → ESCOLA' : 'ESCOLA → CASA'})
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Viagem em Andamento • {activeTrip.direction === 'ida' ? 'Ida para Escola' : 'Volta para Casa'}
                </span>
                <p className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                  {currentRoute?.code} — {currentRoute?.name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentBox((v) => !v)}
                  className="px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle size={14} />
                  Atraso / Aviso
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleEndTrip}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                    onboardCount > 0
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300'
                      : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  }`}
                >
                  <Square size={13} />
                  Encerrar Viagem
                </button>
              </div>
            </div>

            {/* Trava Anti-Esquecimento */}
            {onboardCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800 rounded-2xl px-4 py-2.5 text-xs text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                  <span>
                    Trava Anti-Esquecimento: {onboardCount} aluno(s) a bordo. Desembarque todos antes de encerrar.
                  </span>
                </div>
                {activeTrip.direction === 'ida' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleDisembarkAll}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={13} />
                    Desembarcar Todos na Escola
                  </button>
                )}
              </div>
            )}

            {/* Resumo Rápido */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Previstos</p>
                <p className="text-lg font-black text-neutral-900 dark:text-white">{routeStudents.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">A Bordo</p>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{onboardCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                <p className="text-[10px] font-bold text-indigo-600 uppercase">Entregues</p>
                <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{disembarkedCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Faltas</p>
                <p className="text-lg font-black text-amber-700 dark:text-amber-300">{absentCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Caixa de Ocorrência / Atraso */}
        {showIncidentBox && activeTrip && (
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-300">
                Comunicar Atraso ou Ocorrência aos Pais
              </span>
              <input
                type="number"
                min={0}
                max={180}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="w-24 px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-amber-300 text-xs font-bold"
                placeholder="Min"
              />
            </div>
            <input
              type="text"
              value={incidentNote}
              onChange={(e) => setIncidentNote(e.target.value)}
              placeholder="Ex: Estrada com barro após chuva, previsão de +15 min..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-amber-200 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowIncidentBox(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-500 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveIncident}
                className="px-4 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black cursor-pointer"
              >
                Enviar Aviso
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Chamada Agrupada por Ponto de Referência */}
      <div className="space-y-4">
        {routeStops.map((stop) => {
          const stopStudents = routeStudents.filter((s) => s.stop_id === stop.id);
          if (stopStudents.length === 0 && !stop.is_rural) return null;

          return (
            <div
              key={stop.id}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm"
            >
              <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                    {stop.order_index}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <MapPin size={14} className="text-indigo-500" />
                      {stop.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      {stop.estimated_time ? `Previsto: ${stop.estimated_time}` : 'Horário flexível'}
                      {stop.reference_note ? ` • ${stop.reference_note}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={capturingStopId === stop.id}
                  onClick={() => handleCaptureStopGps(stop)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 cursor-pointer hover:bg-indigo-50"
                  title="Salvar coordenada GPS atual para este ponto de referência"
                >
                  {capturingStopId === stop.id ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Compass size={12} />
                  )}
                  {stop.lat != null ? 'Atualizar GPS' : 'Capturar GPS'}
                </button>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stopStudents.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-neutral-400">Nenhum aluno vinculado a este ponto.</p>
                ) : (
                  stopStudents.map((student) => {
                    const status = getStudentStatus(student.id);
                    return (
                      <div
                        key={student.id}
                        className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">
                            {student.student_name}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {student.school_name} • Resp.: {student.guardian_name || 'Não informado'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(student, 'embarcou')}
                            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                              status === 'embarcou'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-50'
                            }`}
                          >
                            <UserCheck size={14} />
                            Embarcou
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(student, 'desembarcou')}
                            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                              status === 'desembarcou'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-indigo-50'
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            Desembarcou
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(student, 'faltou')}
                            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                              status === 'faltou'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-amber-50'
                            }`}
                          >
                            <UserX size={14} />
                            Faltou
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {/* Alunos sem ponto definido */}
        {routeStudents.filter((s) => !s.stop_id).length > 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h4 className="text-xs font-black uppercase text-neutral-400 mb-3 flex items-center gap-1.5">
              <Users size={14} /> Alunos sem ponto de referência vinculado
            </h4>
            <div className="space-y-2">
              {routeStudents
                .filter((s) => !s.stop_id)
                .map((student) => {
                  const status = getStudentStatus(student.id);
                  return (
                    <div key={student.id} className="flex items-center justify-between gap-2 py-2 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                        {student.student_name}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(student, 'embarcou')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                            status === 'embarcou' ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800'
                          }`}
                        >
                          Embarcou
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(student, 'desembarcou')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                            status === 'desembarcou' ? 'bg-indigo-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800'
                          }`}
                        >
                          Desembarcou
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
