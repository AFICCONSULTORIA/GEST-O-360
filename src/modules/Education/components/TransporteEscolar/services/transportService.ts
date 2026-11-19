import { supabase, supabaseAnon } from '../../../../../lib/supabase';
import type {
  AttendanceStatus,
  OfflineAttendancePendingItem,
  ParentTransportLookupResult,
  SchoolAttendanceRecord,
  SchoolBus,
  SchoolRoute,
  SchoolStop,
  SchoolTransportStudent,
  SchoolTrip,
  TripDirection,
} from '../types';

const STORAGE_KEY_PREFIX = 'gestao360_school_transport_v1_';
const OFFLINE_QUEUE_KEY = 'gestao360_school_transport_offline_queue';

interface LocalTransportStore {
  buses: SchoolBus[];
  routes: SchoolRoute[];
  stops: SchoolStop[];
  students: SchoolTransportStudent[];
  trips: SchoolTrip[];
  attendance: SchoolAttendanceRecord[];
}

function getDefaultStore(institutionId: string): LocalTransportStore {
  const bus1Id = 'bus-demo-01';
  const bus2Id = 'bus-demo-02';
  const route1Id = 'route-demo-01';
  const route2Id = 'route-demo-02';
  const stop1Id = 'stop-demo-01';
  const stop2Id = 'stop-demo-02';
  const stop3Id = 'stop-demo-03';
  const stop4Id = 'stop-demo-04';
  const today = new Date().toISOString().slice(0, 10);

  return {
    buses: [
      {
        id: bus1Id,
        institution_id: institutionId,
        prefix: 'ONB-01',
        plate: 'QRT-4E21',
        model: 'Marcopolo Volare V8L 4x4 Rural',
        capacity: 36,
        driver_name: 'José Carlos Pereira',
        driver_phone: '(62) 99123-4410',
        monitor_name: 'Ana Paula Ferreira',
        monitor_phone: '(62) 99210-8832',
        tracker_device_id: 'TRK-ONB01-8891',
        tracker_status: 'online',
        last_lat: -16.6789,
        last_lng: -49.2552,
        last_speed_kmh: 42,
        last_ignition: true,
        last_signal_at: new Date().toISOString(),
        status: 'ativo',
      },
      {
        id: bus2Id,
        institution_id: institutionId,
        prefix: 'ONB-02',
        plate: 'PRX-8A19',
        model: 'Iveco Daily GranClass 30L',
        capacity: 28,
        driver_name: 'Marcos Antônio Silva',
        driver_phone: '(62) 99341-7720',
        monitor_name: 'Juliana Costa',
        monitor_phone: '(62) 99455-1209',
        tracker_device_id: 'TRK-ONB02-8892',
        tracker_status: 'offline',
        last_lat: -16.6912,
        last_lng: -49.2714,
        last_speed_kmh: 0,
        last_ignition: false,
        last_signal_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        status: 'ativo',
      },
    ],
    routes: [
      {
        id: route1Id,
        institution_id: institutionId,
        name: 'Linha Fazenda Boa Vista / Zona Rural Norte',
        code: 'R-01',
        shift: 'manha',
        direction: 'ida_volta',
        school_name: 'E.M. Monteiro Lobato',
        bus_id: bus1Id,
        departure_time: '06:15',
        arrival_time: '07:10',
        status: 'ativa',
      },
      {
        id: route2Id,
        institution_id: institutionId,
        name: 'Linha Assentamento Esperança',
        code: 'R-02',
        shift: 'tarde',
        direction: 'ida_volta',
        school_name: 'E.M. Cora Coralina',
        bus_id: bus2Id,
        departure_time: '12:15',
        arrival_time: '13:05',
        status: 'ativa',
      },
    ],
    stops: [
      {
        id: stop1Id,
        institution_id: institutionId,
        route_id: route1Id,
        name: 'Porteira Fazenda Santa Maria',
        reference_note: 'Ao lado da caixa d’água azul',
        order_index: 1,
        lat: -16.665,
        lng: -49.282,
        estimated_time: '06:20',
        is_rural: true,
      },
      {
        id: stop2Id,
        institution_id: institutionId,
        route_id: route1Id,
        name: 'Encruzilhada da Serra (Km 12)',
        reference_note: 'Ponto coberto na estrada de terra',
        order_index: 2,
        lat: -16.674,
        lng: -49.266,
        estimated_time: '06:35',
        is_rural: true,
      },
      {
        id: stop3Id,
        institution_id: institutionId,
        route_id: route1Id,
        name: 'Vila São Pedro - Praça Central',
        reference_note: 'Em frente ao posto de saúde',
        order_index: 3,
        lat: -16.682,
        lng: -49.251,
        estimated_time: '06:50',
        is_rural: false,
      },
      {
        id: stop4Id,
        institution_id: institutionId,
        route_id: route2Id,
        name: 'Sede Assentamento Esperança',
        reference_note: 'Galpão comunitário',
        order_index: 1,
        lat: -16.695,
        lng: -49.275,
        estimated_time: '12:20',
        is_rural: true,
      },
    ],
    students: [
      {
        id: 'stu-demo-01',
        institution_id: institutionId,
        route_id: route1Id,
        stop_id: stop1Id,
        student_name: 'Lucas Gabriel Oliveira',
        student_cpf: '11122233344',
        guardian_name: 'Maria Aparecida Oliveira',
        guardian_cpf: '12345678909',
        guardian_phone: '(62) 99811-2233',
        birth_date: '2016-05-14',
        school_name: 'E.M. Monteiro Lobato',
        shift: 'manha',
        uses_outbound: true,
        uses_inbound: true,
        active: true,
      },
      {
        id: 'stu-demo-02',
        institution_id: institutionId,
        route_id: route1Id,
        stop_id: stop2Id,
        student_name: 'Mariana Souza Lima',
        student_cpf: '55566677788',
        guardian_name: 'Roberto Lima',
        guardian_cpf: '98765432100',
        guardian_phone: '(62) 99744-1100',
        birth_date: '2015-09-22',
        school_name: 'E.M. Monteiro Lobato',
        shift: 'manha',
        uses_outbound: true,
        uses_inbound: true,
        active: true,
      },
      {
        id: 'stu-demo-03',
        institution_id: institutionId,
        route_id: route1Id,
        stop_id: stop3Id,
        student_name: 'Pedro Henrique Santos',
        student_cpf: '22233344455',
        guardian_name: 'Cláudia Santos',
        guardian_cpf: '45678912300',
        guardian_phone: '(62) 99612-8877',
        birth_date: '2017-02-10',
        school_name: 'E.M. Monteiro Lobato',
        shift: 'manha',
        uses_outbound: true,
        uses_inbound: true,
        active: true,
      },
    ],
    trips: [
      {
        id: 'trip-demo-01',
        institution_id: institutionId,
        route_id: route1Id,
        bus_id: bus1Id,
        trip_date: today,
        direction: 'ida',
        status: 'em_andamento',
        started_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        monitor_name: 'Ana Paula Ferreira',
        driver_name: 'José Carlos Pereira',
        delay_minutes: 0,
        incident_note: null,
        current_lat: -16.6789,
        current_lng: -49.2552,
      },
    ],
    attendance: [
      {
        id: 'att-demo-01',
        institution_id: institutionId,
        trip_id: 'trip-demo-01',
        student_id: 'stu-demo-01',
        stop_id: stop1Id,
        status: 'embarcou',
        boarded_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        boarded_lat: -16.665,
        boarded_lng: -49.282,
        recorded_by: 'Ana Paula Ferreira',
      },
      {
        id: 'att-demo-02',
        institution_id: institutionId,
        trip_id: 'trip-demo-01',
        student_id: 'stu-demo-02',
        stop_id: stop2Id,
        status: 'embarcou',
        boarded_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        boarded_lat: -16.674,
        boarded_lng: -49.266,
        recorded_by: 'Ana Paula Ferreira',
      },
      {
        id: 'att-demo-03',
        institution_id: institutionId,
        trip_id: 'trip-demo-01',
        student_id: 'stu-demo-03',
        stop_id: stop3Id,
        status: 'aguardando',
      },
    ],
  };
}

function readLocalStore(institutionId: string): LocalTransportStore {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${institutionId}`);
    if (raw) {
      return JSON.parse(raw) as LocalTransportStore;
    }
  } catch {
    // ignore storage errors
  }
  const initial = getDefaultStore(institutionId);
  writeLocalStore(institutionId, initial);
  return initial;
}

function writeLocalStore(institutionId: string, store: LocalTransportStore): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${institutionId}`, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const transportService = {
  async loadAll(institutionId: string): Promise<LocalTransportStore> {
    const local = readLocalStore(institutionId);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [busesRes, routesRes, stopsRes, studentsRes, tripsRes] = await Promise.all([
        supabase.from('school_transport_buses').select('*').eq('institution_id', institutionId).order('prefix'),
        supabase.from('school_transport_routes').select('*').eq('institution_id', institutionId).order('code'),
        supabase.from('school_transport_stops').select('*').eq('institution_id', institutionId).order('order_index'),
        supabase.from('school_transport_students').select('*').eq('institution_id', institutionId).eq('active', true).order('student_name'),
        supabase.from('school_transport_trips').select('*').eq('institution_id', institutionId).eq('trip_date', today).order('created_at', { ascending: false }),
      ]);

      if (busesRes.error || routesRes.error || stopsRes.error || studentsRes.error || tripsRes.error) {
        return local;
      }

      const trips = (tripsRes.data || []) as SchoolTrip[];
      const tripIds = trips.map((t) => t.id);
      let attendance: SchoolAttendanceRecord[] = [];

      if (tripIds.length > 0) {
        const attRes = await supabase
          .from('school_transport_attendance')
          .select('*')
          .in('trip_id', tripIds);
        if (!attRes.error && attRes.data) {
          attendance = attRes.data as SchoolAttendanceRecord[];
        }
      }

      // Se o banco ainda estiver vazio mas já tivermos dados locais de demonstração, mantém o local até o usuário cadastrar
      if ((busesRes.data?.length ?? 0) === 0 && (routesRes.data?.length ?? 0) === 0) {
        return local;
      }

      const merged: LocalTransportStore = {
        buses: (busesRes.data || []) as SchoolBus[],
        routes: (routesRes.data || []) as SchoolRoute[],
        stops: (stopsRes.data || []) as SchoolStop[],
        students: (studentsRes.data || []) as SchoolTransportStudent[],
        trips,
        attendance,
      };
      writeLocalStore(institutionId, merged);
      return merged;
    } catch {
      return local;
    }
  },

  async saveBus(institutionId: string, bus: Omit<SchoolBus, 'id' | 'institution_id'> & { id?: string }): Promise<SchoolBus> {
    const store = readLocalStore(institutionId);
    const record: SchoolBus = {
      ...bus,
      id: bus.id || makeUuid(),
      institution_id: institutionId,
    };

    try {
      const { data, error } = await supabase
        .from('school_transport_buses')
        .upsert(record)
        .select()
        .single();
      if (!error && data) {
        const saved = data as SchoolBus;
        store.buses = store.buses.some((b) => b.id === saved.id)
          ? store.buses.map((b) => (b.id === saved.id ? saved : b))
          : [...store.buses, saved];
        writeLocalStore(institutionId, store);
        return saved;
      }
    } catch {
      // fallback to local
    }

    store.buses = store.buses.some((b) => b.id === record.id)
      ? store.buses.map((b) => (b.id === record.id ? record : b))
      : [...store.buses, record];
    writeLocalStore(institutionId, store);
    return record;
  },

  async saveRoute(institutionId: string, route: Omit<SchoolRoute, 'id' | 'institution_id'> & { id?: string }): Promise<SchoolRoute> {
    const store = readLocalStore(institutionId);
    const record: SchoolRoute = {
      ...route,
      id: route.id || makeUuid(),
      institution_id: institutionId,
    };

    try {
      const { data, error } = await supabase
        .from('school_transport_routes')
        .upsert(record)
        .select()
        .single();
      if (!error && data) {
        const saved = data as SchoolRoute;
        store.routes = store.routes.some((r) => r.id === saved.id)
          ? store.routes.map((r) => (r.id === saved.id ? saved : r))
          : [...store.routes, saved];
        writeLocalStore(institutionId, store);
        return saved;
      }
    } catch {
      // fallback
    }

    store.routes = store.routes.some((r) => r.id === record.id)
      ? store.routes.map((r) => (r.id === record.id ? record : r))
      : [...store.routes, record];
    writeLocalStore(institutionId, store);
    return record;
  },

  async saveStop(institutionId: string, stop: Omit<SchoolStop, 'id' | 'institution_id'> & { id?: string }): Promise<SchoolStop> {
    const store = readLocalStore(institutionId);
    const record: SchoolStop = {
      ...stop,
      id: stop.id || makeUuid(),
      institution_id: institutionId,
    };

    try {
      const { data, error } = await supabase
        .from('school_transport_stops')
        .upsert(record)
        .select()
        .single();
      if (!error && data) {
        const saved = data as SchoolStop;
        store.stops = store.stops.some((s) => s.id === saved.id)
          ? store.stops.map((s) => (s.id === saved.id ? saved : s))
          : [...store.stops, saved];
        writeLocalStore(institutionId, store);
        return saved;
      }
    } catch {
      // fallback
    }

    store.stops = store.stops.some((s) => s.id === record.id)
      ? store.stops.map((s) => (s.id === record.id ? record : s))
      : [...store.stops, record];
    writeLocalStore(institutionId, store);
    return record;
  },

  async saveStudent(
    institutionId: string,
    student: Omit<SchoolTransportStudent, 'id' | 'institution_id'> & { id?: string }
  ): Promise<SchoolTransportStudent> {
    const store = readLocalStore(institutionId);
    const record: SchoolTransportStudent = {
      ...student,
      id: student.id || makeUuid(),
      institution_id: institutionId,
      student_cpf: student.student_cpf?.replace(/\D/g, ''),
      guardian_cpf: student.guardian_cpf?.replace(/\D/g, ''),
    };

    try {
      const { data, error } = await supabase
        .from('school_transport_students')
        .upsert(record)
        .select()
        .single();
      if (!error && data) {
        const saved = data as SchoolTransportStudent;
        store.students = store.students.some((s) => s.id === saved.id)
          ? store.students.map((s) => (s.id === saved.id ? saved : s))
          : [...store.students, saved];
        writeLocalStore(institutionId, store);
        return saved;
      }
    } catch {
      // fallback
    }

    store.students = store.students.some((s) => s.id === record.id)
      ? store.students.map((s) => (s.id === record.id ? record : s))
      : [...store.students, record];
    writeLocalStore(institutionId, store);
    return record;
  },

  async startTrip(
    institutionId: string,
    route: SchoolRoute,
    bus: SchoolBus | undefined,
    direction: TripDirection,
    monitorName: string
  ): Promise<SchoolTrip> {
    const store = readLocalStore(institutionId);
    const today = new Date().toISOString().slice(0, 10);

    const trip: SchoolTrip = {
      id: makeUuid(),
      institution_id: institutionId,
      route_id: route.id,
      bus_id: bus?.id ?? route.bus_id ?? null,
      trip_date: today,
      direction,
      status: 'em_andamento',
      started_at: new Date().toISOString(),
      monitor_name: monitorName || bus?.monitor_name || 'Monitor Escolar',
      driver_name: bus?.driver_name || 'Motorista da Frota',
      delay_minutes: 0,
      incident_note: null,
      current_lat: bus?.last_lat ?? null,
      current_lng: bus?.last_lng ?? null,
    };

    const routeStudents = store.students.filter(
      (s) =>
        s.route_id === route.id &&
        s.active &&
        (direction === 'ida' ? s.uses_outbound : s.uses_inbound)
    );

    const initialAttendance: SchoolAttendanceRecord[] = routeStudents.map((s) => ({
      id: makeUuid(),
      institution_id: institutionId,
      trip_id: trip.id,
      student_id: s.id,
      stop_id: s.stop_id,
      status: 'aguardando',
    }));

    try {
      const { data, error } = await supabase.from('school_transport_trips').insert(trip).select().single();
      if (!error && data) {
        const savedTrip = data as SchoolTrip;
        if (initialAttendance.length > 0) {
          await supabase.from('school_transport_attendance').insert(
            initialAttendance.map((a) => ({ ...a, trip_id: savedTrip.id }))
          );
        }
        store.trips = [savedTrip, ...store.trips];
        store.attendance = [...store.attendance, ...initialAttendance.map((a) => ({ ...a, trip_id: savedTrip.id }))];
        writeLocalStore(institutionId, store);
        return savedTrip;
      }
    } catch {
      // fallback
    }

    store.trips = [trip, ...store.trips];
    store.attendance = [...store.attendance, ...initialAttendance];
    writeLocalStore(institutionId, store);
    return trip;
  },

  async endTrip(institutionId: string, tripId: string): Promise<{ ok: boolean; error?: string }> {
    const store = readLocalStore(institutionId);
    const onboard = store.attendance.filter((a) => a.trip_id === tripId && a.status === 'embarcou');
    if (onboard.length > 0) {
      return {
        ok: false,
        error: `Trava de Segurança: Ainda há ${onboard.length} aluno(s) marcado(s) como "A Bordo". Realize o desembarque antes de encerrar a viagem.`,
      };
    }

    const endedAt = new Date().toISOString();
    try {
      await supabase
        .from('school_transport_trips')
        .update({ status: 'finalizada', ended_at: endedAt })
        .eq('id', tripId);
    } catch {
      // fallback
    }

    store.trips = store.trips.map((t) =>
      t.id === tripId ? { ...t, status: 'finalizada', ended_at: endedAt } : t
    );
    writeLocalStore(institutionId, store);
    return { ok: true };
  },

  async reportTripIncident(
    institutionId: string,
    tripId: string,
    delayMinutes: number,
    note: string
  ): Promise<void> {
    const store = readLocalStore(institutionId);
    try {
      await supabase
        .from('school_transport_trips')
        .update({ delay_minutes: delayMinutes, incident_note: note })
        .eq('id', tripId);
    } catch {
      // fallback
    }

    store.trips = store.trips.map((t) =>
      t.id === tripId ? { ...t, delay_minutes: delayMinutes, incident_note: note } : t
    );
    writeLocalStore(institutionId, store);
  },

  async recordAttendance(
    institutionId: string,
    tripId: string,
    studentId: string,
    stopId: string | null | undefined,
    status: AttendanceStatus,
    recordedBy: string,
    coords?: { lat: number; lng: number } | null
  ): Promise<{ synced: boolean }> {
    const store = readLocalStore(institutionId);
    const nowIso = new Date().toISOString();
    const existing = store.attendance.find((a) => a.trip_id === tripId && a.student_id === studentId);

    const updated: SchoolAttendanceRecord = {
      id: existing?.id || makeUuid(),
      institution_id: institutionId,
      trip_id: tripId,
      student_id: studentId,
      stop_id: stopId ?? existing?.stop_id ?? null,
      status,
      boarded_at: status === 'embarcou' ? nowIso : existing?.boarded_at ?? null,
      disembarked_at: status === 'desembarcou' ? nowIso : existing?.disembarked_at ?? null,
      boarded_lat: status === 'embarcou' ? coords?.lat ?? existing?.boarded_lat ?? null : existing?.boarded_lat ?? null,
      boarded_lng: status === 'embarcou' ? coords?.lng ?? existing?.boarded_lng ?? null : existing?.boarded_lng ?? null,
      recorded_by: recordedBy,
    };

    store.attendance = existing
      ? store.attendance.map((a) => (a.id === updated.id ? updated : a))
      : [...store.attendance, updated];
    writeLocalStore(institutionId, store);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAttendance({
        id: updated.id,
        institution_id: institutionId,
        trip_id: tripId,
        student_id: studentId,
        stop_id: stopId,
        status,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        recorded_by: recordedBy,
        timestamp: nowIso,
      });
      return { synced: false };
    }

    try {
      const { error } = await supabase
        .from('school_transport_attendance')
        .upsert(updated, { onConflict: 'trip_id,student_id' });
      if (error) throw error;
      return { synced: true };
    } catch {
      enqueueOfflineAttendance({
        id: updated.id,
        institution_id: institutionId,
        trip_id: tripId,
        student_id: studentId,
        stop_id: stopId,
        status,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        recorded_by: recordedBy,
        timestamp: nowIso,
      });
      return { synced: false };
    }
  },

  async disembarkAllOnboard(
    institutionId: string,
    tripId: string,
    recordedBy: string
  ): Promise<number> {
    const store = readLocalStore(institutionId);
    const onboard = store.attendance.filter((a) => a.trip_id === tripId && a.status === 'embarcou');
    for (const item of onboard) {
      await this.recordAttendance(institutionId, tripId, item.student_id, item.stop_id, 'desembarcou', recordedBy);
    }
    return onboard.length;
  },

  async syncOfflineAttendance(): Promise<number> {
    const queue = getOfflineQueue();
    if (queue.length === 0) return 0;

    const remaining: OfflineAttendancePendingItem[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const { error } = await supabase.from('school_transport_attendance').upsert(
          {
            institution_id: item.institution_id,
            trip_id: item.trip_id,
            student_id: item.student_id,
            stop_id: item.stop_id ?? null,
            status: item.status,
            boarded_at: item.status === 'embarcou' ? item.timestamp : null,
            disembarked_at: item.status === 'desembarcou' ? item.timestamp : null,
            boarded_lat: item.lat ?? null,
            boarded_lng: item.lng ?? null,
            recorded_by: item.recorded_by,
          },
          { onConflict: 'trip_id,student_id' }
        );
        if (error) throw error;
        syncedCount++;
      } catch {
        remaining.push(item);
      }
    }

    setOfflineQueue(remaining);
    return syncedCount;
  },

  getOfflinePendingCount(): number {
    return getOfflineQueue().length;
  },

  async ingestTrackerTelemetry(
    institutionId: string,
    trackerDeviceId: string,
    lat: number,
    lng: number,
    speedKmh: number,
    ignition = true
  ): Promise<void> {
    const store = readLocalStore(institutionId);
    const nowIso = new Date().toISOString();

    store.buses = store.buses.map((b) =>
      b.tracker_device_id === trackerDeviceId
        ? {
            ...b,
            last_lat: lat,
            last_lng: lng,
            last_speed_kmh: speedKmh,
            last_ignition: ignition,
            last_signal_at: nowIso,
            tracker_status: 'online',
          }
        : b
    );

    const bus = store.buses.find((b) => b.tracker_device_id === trackerDeviceId);
    if (bus) {
      store.trips = store.trips.map((t) =>
        t.bus_id === bus.id && t.status === 'em_andamento'
          ? { ...t, current_lat: lat, current_lng: lng }
          : t
      );
    }
    writeLocalStore(institutionId, store);

    try {
      await supabase.rpc('ingest_bus_tracker_telemetry', {
        p_tracker_device_id: trackerDeviceId,
        p_lat: lat,
        p_lng: lng,
        p_speed: speedKmh,
        p_ignition: ignition,
      });
    } catch {
      // fallback already persisted locally
    }
  },

  async parentLookupTransport(
    institutionId: string,
    cpf: string,
    birthDate: string
  ): Promise<ParentTransportLookupResult> {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11 || !birthDate) {
      return {
        found: false,
        error: 'Informe um CPF válido (11 dígitos) e a data de nascimento do aluno.',
      };
    }

    try {
      const { data, error } = await supabaseAnon.rpc('parent_lookup_school_transport', {
        p_institution_id: institutionId,
        p_cpf: cleanCpf,
        p_birth_date: birthDate,
      });
      if (!error && data) {
        const result = data as ParentTransportLookupResult;
        if (result.found) return result;
      }
    } catch {
      // fallback to local store
    }

    // Fallback local para demonstração/desenvolvimento
    const store = readLocalStore(institutionId);
    const student = store.students.find(
      (s) =>
        s.active &&
        s.birth_date === birthDate &&
        (s.student_cpf?.replace(/\D/g, '') === cleanCpf ||
          s.guardian_cpf?.replace(/\D/g, '') === cleanCpf)
    );

    if (!student) {
      return {
        found: false,
        error: 'Nenhum aluno encontrado com o CPF e data de nascimento informados.',
      };
    }

    const route = store.routes.find((r) => r.id === student.route_id);
    const stop = store.stops.find((st) => st.id === student.stop_id);
    const today = new Date().toISOString().slice(0, 10);
    const trip = store.trips.find((t) => t.route_id === student.route_id && t.trip_date === today) || null;
    const bus = store.buses.find((b) => b.id === (trip?.bus_id || route?.bus_id));
    const att = trip
      ? store.attendance.find((a) => a.trip_id === trip.id && a.student_id === student.id) || null
      : null;

    return {
      found: true,
      student: {
        id: student.id,
        name: student.student_name,
        school_name: student.school_name,
        shift: student.shift,
        stop_name: stop?.name || 'Ponto não definido',
      },
      route: route
        ? {
            id: route.id,
            name: route.name,
            code: route.code,
            departure_time: route.departure_time,
            arrival_time: route.arrival_time,
          }
        : undefined,
      trip: trip
        ? {
            id: trip.id,
            direction: trip.direction,
            status: trip.status,
            started_at: trip.started_at,
            ended_at: trip.ended_at,
            delay_minutes: trip.delay_minutes,
            incident_note: trip.incident_note,
          }
        : null,
      attendance: att
        ? {
            status: att.status,
            boarded_at: att.boarded_at,
            disembarked_at: att.disembarked_at,
          }
        : null,
      bus_location:
        trip?.status === 'em_andamento' && bus
          ? {
              prefix: bus.prefix,
              plate: bus.plate,
              lat: trip.current_lat ?? bus.last_lat,
              lng: trip.current_lng ?? bus.last_lng,
              speed_kmh: bus.last_speed_kmh,
              last_signal_at: bus.last_signal_at,
              stop_lat: stop?.lat,
              stop_lng: stop?.lng,
            }
          : null,
    };
  },
};

function getOfflineQueue(): OfflineAttendancePendingItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineAttendancePendingItem[]) : [];
  } catch {
    return [];
  }
}

function setOfflineQueue(items: OfflineAttendancePendingItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function enqueueOfflineAttendance(item: OfflineAttendancePendingItem): void {
  const queue = getOfflineQueue().filter(
    (q) => !(q.trip_id === item.trip_id && q.student_id === item.student_id)
  );
  setOfflineQueue([...queue, item]);
}
