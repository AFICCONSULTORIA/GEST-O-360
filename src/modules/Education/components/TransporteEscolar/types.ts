export type TrackerStatus = 'online' | 'offline' | 'maintenance' | 'simulado';
export type BusStatus = 'ativo' | 'manutencao' | 'inativo';
export type TransportShift = 'manha' | 'tarde' | 'noite' | 'integral';
export type RouteDirection = 'ida' | 'volta' | 'ida_volta';
export type TripDirection = 'ida' | 'volta';
export type TripStatus = 'aguardando' | 'em_andamento' | 'finalizada' | 'cancelada';
export type AttendanceStatus = 'aguardando' | 'embarcou' | 'desembarcou' | 'faltou';

export interface SchoolBus {
  id: string;
  institution_id: string;
  prefix: string;
  plate: string;
  model: string;
  capacity: number;
  driver_name: string;
  driver_phone?: string;
  monitor_name?: string;
  monitor_phone?: string;
  tracker_device_id?: string;
  tracker_status: TrackerStatus;
  last_lat?: number | null;
  last_lng?: number | null;
  last_speed_kmh?: number;
  last_ignition?: boolean;
  last_signal_at?: string | null;
  status: BusStatus;
  created_at?: string;
}

export interface SchoolRoute {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  shift: TransportShift;
  direction: RouteDirection;
  school_name: string;
  bus_id?: string | null;
  departure_time: string;
  arrival_time: string;
  status: 'ativa' | 'inativa';
  created_at?: string;
}

export interface SchoolStop {
  id: string;
  institution_id: string;
  route_id: string;
  name: string;
  reference_note?: string;
  order_index: number;
  lat?: number | null;
  lng?: number | null;
  estimated_time?: string;
  is_rural: boolean;
}

export interface SchoolTransportStudent {
  id: string;
  institution_id: string;
  route_id: string;
  stop_id?: string | null;
  student_name: string;
  student_cpf?: string;
  guardian_name?: string;
  guardian_cpf?: string;
  guardian_phone?: string;
  birth_date: string;
  school_name: string;
  shift: TransportShift;
  uses_outbound: boolean;
  uses_inbound: boolean;
  active: boolean;
}

export interface SchoolTrip {
  id: string;
  institution_id: string;
  route_id: string;
  bus_id?: string | null;
  trip_date: string;
  direction: TripDirection;
  status: TripStatus;
  started_at?: string | null;
  ended_at?: string | null;
  monitor_name?: string;
  driver_name?: string;
  delay_minutes: number;
  incident_note?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
}

export interface SchoolAttendanceRecord {
  id: string;
  institution_id: string;
  trip_id: string;
  student_id: string;
  stop_id?: string | null;
  status: AttendanceStatus;
  boarded_at?: string | null;
  disembarked_at?: string | null;
  boarded_lat?: number | null;
  boarded_lng?: number | null;
  recorded_by?: string;
}

export interface ParentTransportLookupResult {
  found: boolean;
  error?: string;
  student?: {
    id: string;
    name: string;
    school_name: string;
    shift: TransportShift;
    stop_name: string;
  };
  route?: {
    id: string;
    name: string;
    code: string;
    departure_time: string;
    arrival_time: string;
  };
  trip?: {
    id: string;
    direction: TripDirection;
    status: TripStatus;
    started_at?: string | null;
    ended_at?: string | null;
    delay_minutes: number;
    incident_note?: string | null;
  } | null;
  attendance?: {
    status: AttendanceStatus;
    boarded_at?: string | null;
    disembarked_at?: string | null;
  } | null;
  bus_location?: {
    prefix: string;
    plate: string;
    lat?: number | null;
    lng?: number | null;
    speed_kmh?: number;
    last_signal_at?: string | null;
    stop_lat?: number | null;
    stop_lng?: number | null;
  } | null;
}

export interface OfflineAttendancePendingItem {
  id: string;
  institution_id: string;
  trip_id: string;
  student_id: string;
  stop_id?: string | null;
  status: AttendanceStatus;
  lat?: number | null;
  lng?: number | null;
  recorded_by: string;
  timestamp: string;
}
