-- ============================================================================
-- MÓDULO: EDUCAÇÃO / TRANSPORTE ESCOLAR EM TEMPO REAL & PRESENÇA NO ÔNIBUS
-- Data: 2026-11-19
-- Descrição: Estrutura multi-tenant para gestão de frota própria escolar,
--            rotas, pontos de referência rurais/urbanos, alunos vinculados,
--            viagens diárias, chamada pelo monitor escolar, telemetria GPS
--            (rastreadores físicos) e consulta LGPD para pais/responsáveis.
-- ============================================================================

-- 1. Ônibus Escolares (Frota Própria + ID do Rastreador GPS)
CREATE TABLE IF NOT EXISTS public.school_transport_buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  prefix TEXT NOT NULL,
  plate TEXT NOT NULL,
  model TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 44,
  driver_name TEXT NOT NULL,
  driver_phone TEXT,
  monitor_name TEXT,
  monitor_phone TEXT,
  tracker_device_id TEXT,
  tracker_status TEXT NOT NULL DEFAULT 'offline'
    CHECK (tracker_status IN ('online', 'offline', 'maintenance', 'simulado')),
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  last_speed_kmh DOUBLE PRECISION DEFAULT 0,
  last_ignition BOOLEAN DEFAULT false,
  last_signal_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'manutencao', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_buses_inst
  ON public.school_transport_buses (institution_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_st_buses_tracker_unique
  ON public.school_transport_buses (institution_id, tracker_device_id)
  WHERE tracker_device_id IS NOT NULL AND tracker_device_id <> '';

-- 2. Rotas Escolares
CREATE TABLE IF NOT EXISTS public.school_transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  shift TEXT NOT NULL DEFAULT 'manha'
    CHECK (shift IN ('manha', 'tarde', 'noite', 'integral')),
  direction TEXT NOT NULL DEFAULT 'ida_volta'
    CHECK (direction IN ('ida', 'volta', 'ida_volta')),
  school_name TEXT NOT NULL,
  bus_id UUID REFERENCES public.school_transport_buses(id) ON DELETE SET NULL,
  departure_time TEXT NOT NULL DEFAULT '06:30',
  arrival_time TEXT NOT NULL DEFAULT '07:20',
  status TEXT NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'inativa')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_routes_inst
  ON public.school_transport_routes (institution_id, shift, status);

-- 3. Pontos de Referência / Paradas da Rota
CREATE TABLE IF NOT EXISTS public.school_transport_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  route_id UUID NOT NULL REFERENCES public.school_transport_routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference_note TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  estimated_time TEXT,
  is_rural BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_stops_route
  ON public.school_transport_stops (route_id, order_index ASC);

-- 4. Alunos do Transporte Escolar
CREATE TABLE IF NOT EXISTS public.school_transport_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  route_id UUID NOT NULL REFERENCES public.school_transport_routes(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.school_transport_stops(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  student_cpf TEXT,
  guardian_name TEXT,
  guardian_cpf TEXT,
  guardian_phone TEXT,
  birth_date DATE NOT NULL,
  school_name TEXT NOT NULL,
  shift TEXT NOT NULL DEFAULT 'manha'
    CHECK (shift IN ('manha', 'tarde', 'noite', 'integral')),
  uses_outbound BOOLEAN NOT NULL DEFAULT true,
  uses_inbound BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_students_inst_route
  ON public.school_transport_students (institution_id, route_id, active);

CREATE INDEX IF NOT EXISTS idx_st_students_lookup
  ON public.school_transport_students (institution_id, birth_date);

-- 5. Viagens Diárias (Execução da Rota)
CREATE TABLE IF NOT EXISTS public.school_transport_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  route_id UUID NOT NULL REFERENCES public.school_transport_routes(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES public.school_transport_buses(id) ON DELETE SET NULL,
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  direction TEXT NOT NULL DEFAULT 'ida'
    CHECK (direction IN ('ida', 'volta')),
  status TEXT NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'em_andamento', 'finalizada', 'cancelada')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  monitor_name TEXT,
  driver_name TEXT,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  incident_note TEXT,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_trips_active
  ON public.school_transport_trips (institution_id, trip_date, status);

-- 6. Presença dos Alunos no Ônibus
CREATE TABLE IF NOT EXISTS public.school_transport_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  trip_id UUID NOT NULL REFERENCES public.school_transport_trips(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.school_transport_students(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.school_transport_stops(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'embarcou', 'desembarcou', 'faltou')),
  boarded_at TIMESTAMPTZ,
  disembarked_at TIMESTAMPTZ,
  boarded_lat DOUBLE PRECISION,
  boarded_lng DOUBLE PRECISION,
  recorded_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_st_attendance_trip
  ON public.school_transport_attendance (trip_id, status);

-- 7. Histórico de Telemetria GPS (Rastreadores)
CREATE TABLE IF NOT EXISTS public.school_transport_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  bus_id UUID NOT NULL REFERENCES public.school_transport_buses(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.school_transport_trips(id) ON DELETE SET NULL,
  tracker_device_id TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_kmh DOUBLE PRECISION DEFAULT 0,
  ignition BOOLEAN DEFAULT true,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_telemetry_bus_time
  ON public.school_transport_telemetry (bus_id, recorded_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.school_transport_buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_transport_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_transport_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_transport_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_transport_telemetry ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'school_transport_buses',
    'school_transport_routes',
    'school_transport_stops',
    'school_transport_students',
    'school_transport_trips',
    'school_transport_attendance',
    'school_transport_telemetry'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "st_all_%s" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "st_all_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- RPC 1: INGESTÃO DE TELEMETRIA DO RASTREADOR GPS (Físico ou Simulador)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ingest_bus_tracker_telemetry(
  p_tracker_device_id TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_speed DOUBLE PRECISION DEFAULT 0,
  p_ignition BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bus RECORD;
  v_trip_id UUID;
BEGIN
  SELECT * INTO v_bus
  FROM public.school_transport_buses
  WHERE tracker_device_id = p_tracker_device_id
    AND status = 'ativo'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rastreador não vinculado a nenhum ônibus ativo.');
  END IF;

  UPDATE public.school_transport_buses
  SET
    last_lat = p_lat,
    last_lng = p_lng,
    last_speed_kmh = COALESCE(p_speed, 0),
    last_ignition = COALESCE(p_ignition, true),
    last_signal_at = now(),
    tracker_status = 'online',
    updated_at = now()
  WHERE id = v_bus.id;

  SELECT id INTO v_trip_id
  FROM public.school_transport_trips
  WHERE bus_id = v_bus.id
    AND status = 'em_andamento'
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_trip_id IS NOT NULL THEN
    UPDATE public.school_transport_trips
    SET
      current_lat = p_lat,
      current_lng = p_lng,
      updated_at = now()
    WHERE id = v_trip_id;
  END IF;

  INSERT INTO public.school_transport_telemetry (
    institution_id, bus_id, trip_id, tracker_device_id, lat, lng, speed_kmh, ignition
  ) VALUES (
    v_bus.institution_id, v_bus.id, v_trip_id, p_tracker_device_id, p_lat, p_lng, COALESCE(p_speed, 0), COALESCE(p_ignition, true)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'bus_id', v_bus.id,
    'trip_id', v_trip_id,
    'recorded_at', now()
  );
END;
$$;

-- ============================================================================
-- RPC 2: CONSULTA PÚBLICA PARA PAIS / RESPONSÁVEIS (LGPD)
-- Valida CPF (aluno ou responsável) + Data de Nascimento e retorna apenas
-- o status de presença do próprio aluno e a posição do ônibus se em viagem.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.parent_lookup_school_transport(
  p_institution_id TEXT,
  p_cpf TEXT,
  p_birth_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_cpf TEXT;
  v_student RECORD;
  v_route RECORD;
  v_stop RECORD;
  v_trip RECORD;
  v_bus RECORD;
  v_att RECORD;
  v_has_stop BOOLEAN := false;
  v_has_trip BOOLEAN := false;
  v_has_bus BOOLEAN := false;
  v_has_att BOOLEAN := false;
BEGIN
  v_clean_cpf := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');

  IF length(v_clean_cpf) <> 11 OR p_birth_date IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'Informe um CPF válido (11 dígitos) e a data de nascimento do aluno.');
  END IF;

  SELECT * INTO v_student
  FROM public.school_transport_students
  WHERE institution_id = p_institution_id
    AND active = true
    AND birth_date = p_birth_date
    AND (
      regexp_replace(COALESCE(student_cpf, ''), '\D', '', 'g') = v_clean_cpf
      OR regexp_replace(COALESCE(guardian_cpf, ''), '\D', '', 'g') = v_clean_cpf
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'error', 'Nenhum aluno encontrado com os dados informados.');
  END IF;

  SELECT * INTO v_route FROM public.school_transport_routes WHERE id = v_student.route_id;

  IF v_student.stop_id IS NOT NULL THEN
    SELECT * INTO v_stop FROM public.school_transport_stops WHERE id = v_student.stop_id;
    v_has_stop := FOUND;
  END IF;

  SELECT * INTO v_trip
  FROM public.school_transport_trips
  WHERE route_id = v_student.route_id
    AND trip_date = CURRENT_DATE
    AND status IN ('em_andamento', 'finalizada', 'aguardando')
  ORDER BY
    CASE status WHEN 'em_andamento' THEN 1 WHEN 'aguardando' THEN 2 ELSE 3 END,
    created_at DESC
  LIMIT 1;
  v_has_trip := FOUND;

  IF v_has_trip THEN
    IF v_trip.bus_id IS NOT NULL THEN
      SELECT * INTO v_bus FROM public.school_transport_buses WHERE id = v_trip.bus_id;
      v_has_bus := FOUND;
    END IF;
    SELECT * INTO v_att
    FROM public.school_transport_attendance
    WHERE trip_id = v_trip.id AND student_id = v_student.id
    LIMIT 1;
    v_has_att := FOUND;
  ELSIF v_route.bus_id IS NOT NULL THEN
    SELECT * INTO v_bus FROM public.school_transport_buses WHERE id = v_route.bus_id;
    v_has_bus := FOUND;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'student', jsonb_build_object(
      'id', v_student.id,
      'name', v_student.student_name,
      'school_name', v_student.school_name,
      'shift', v_student.shift,
      'stop_name', CASE WHEN v_has_stop THEN v_stop.name ELSE 'Ponto não definido' END
    ),
    'route', jsonb_build_object(
      'id', v_route.id,
      'name', v_route.name,
      'code', v_route.code,
      'departure_time', v_route.departure_time,
      'arrival_time', v_route.arrival_time
    ),
    'trip', CASE WHEN v_has_trip THEN jsonb_build_object(
      'id', v_trip.id,
      'direction', v_trip.direction,
      'status', v_trip.status,
      'started_at', v_trip.started_at,
      'ended_at', v_trip.ended_at,
      'delay_minutes', v_trip.delay_minutes,
      'incident_note', v_trip.incident_note
    ) ELSE NULL END,
    'attendance', CASE WHEN v_has_att THEN jsonb_build_object(
      'status', v_att.status,
      'boarded_at', v_att.boarded_at,
      'disembarked_at', v_att.disembarked_at
    ) ELSE NULL END,
    -- Por LGPD e segurança, só expõe coordenadas em tempo real enquanto a viagem está em andamento
    'bus_location', CASE WHEN v_has_trip AND v_trip.status = 'em_andamento' AND v_has_bus THEN jsonb_build_object(
      'prefix', v_bus.prefix,
      'plate', v_bus.plate,
      'lat', COALESCE(v_trip.current_lat, v_bus.last_lat),
      'lng', COALESCE(v_trip.current_lng, v_bus.last_lng),
      'speed_kmh', v_bus.last_speed_kmh,
      'last_signal_at', v_bus.last_signal_at,
      'stop_lat', CASE WHEN v_has_stop THEN v_stop.lat ELSE NULL END,
      'stop_lng', CASE WHEN v_has_stop THEN v_stop.lng ELSE NULL END
    ) ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.parent_lookup_school_transport(TEXT, TEXT, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_bus_tracker_telemetry(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated;
