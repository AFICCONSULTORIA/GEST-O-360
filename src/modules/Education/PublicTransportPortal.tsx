import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { LiveBusMap } from './components/TransporteEscolar/components/LiveBusMap';
import { transportService } from './components/TransporteEscolar/services/transportService';
import type { ParentTransportLookupResult, SchoolBus, SchoolStop } from './components/TransporteEscolar/types';

interface PublicTransportPortalProps {
  darkMode?: boolean;
  currentInstitution?: { id: string; name?: string; subdomain?: string } | null;
}

function formatTime(iso?: string | null): string {
  if (!iso) return '--:--';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export const PublicTransportPortal: React.FC<PublicTransportPortalProps> = ({
  currentInstitution,
}) => {
  const institutionId = currentInstitution?.id || 'inst_1';
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParentTransportLookupResult | null>(null);

  const performLookup = async (targetCpf: string, targetBirthDate: string) => {
    setLoading(true);
    try {
      const data = await transportService.parentLookupTransport(
        institutionId,
        targetCpf,
        targetBirthDate
      );
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLookup(cpf, birthDate);
  };

  // Atualização automática a cada 10s enquanto houver viagem ativa
  useEffect(() => {
    if (!result?.found || result.trip?.status !== 'em_andamento') return;
    const timer = setInterval(() => {
      performLookup(cpf, birthDate);
    }, 10000);
    return () => clearInterval(timer);
  }, [result?.found, result?.trip?.status, cpf, birthDate]);

  const mapBus: SchoolBus[] =
    result?.bus_location && result.bus_location.lat != null && result.bus_location.lng != null
      ? [
          {
            id: 'parent-bus',
            institution_id: institutionId,
            prefix: result.bus_location.prefix,
            plate: result.bus_location.plate,
            model: 'Ônibus Escolar',
            capacity: 44,
            driver_name: '',
            tracker_status: 'online',
            last_lat: result.bus_location.lat,
            last_lng: result.bus_location.lng,
            last_speed_kmh: result.bus_location.speed_kmh ?? 0,
            last_signal_at: result.bus_location.last_signal_at,
            status: 'ativo',
          },
        ]
      : [];

  const mapStops: SchoolStop[] =
    result?.bus_location?.stop_lat != null && result.bus_location?.stop_lng != null
      ? [
          {
            id: 'parent-stop',
            institution_id: institutionId,
            route_id: result.route?.id || '',
            name: result.student?.stop_name || 'Ponto do Aluno',
            order_index: 1,
            lat: result.bus_location.stop_lat,
            lng: result.bus_location.stop_lng,
            is_rural: false,
          },
        ]
      : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
              <Bus size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {currentInstitution?.name || 'Prefeitura Municipal'} • Transporte Escolar
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Acompanhamento dos Pais
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Consulte o embarque, desembarque e a localização do ônibus escolar do seu filho em tempo real.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                CPF do Responsável ou Aluno
              </label>
              <input
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                Data de Nascimento do Aluno
              </label>
              <input
                required
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                Consultar
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Protegido pela LGPD: exibe apenas dados do seu filho durante viagem ativa.
            </span>
            <button
              type="button"
              onClick={() => {
                setCpf('123.456.789-09');
                setBirthDate('2016-05-14');
                performLookup('12345678909', '2016-05-14');
              }}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              Testar com aluno exemplo
            </button>
          </div>
        </div>

        {/* Erro de consulta */}
        {result && !result.found && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-sm font-bold text-rose-700 dark:text-rose-300">
            {result.error}
          </div>
        )}

        {/* Resultado encontrado */}
        {result?.found && result.student && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-neutral-900 dark:text-white">
                    {result.student.name}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {result.student.school_name} • Ponto: <strong>{result.student.stop_name}</strong>
                  </p>
                  {result.route && (
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      Rota {result.route.code} — {result.route.name} ({result.route.departure_time} →{' '}
                      {result.route.arrival_time})
                    </p>
                  )}
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    result.trip?.status === 'em_andamento'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {result.trip?.status === 'em_andamento'
                    ? 'Ônibus em Rota'
                    : result.trip?.status === 'finalizada'
                    ? 'Viagem Finalizada'
                    : 'Sem viagem ativa'}
                </span>
              </div>

              {/* Ocorrência / Atraso reportado pelo monitor */}
              {result.trip?.incident_note && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-black uppercase">
                      Aviso da Rota {result.trip.delay_minutes > 0 ? `(+${result.trip.delay_minutes} min)` : ''}
                    </p>
                    <p className="mt-0.5">{result.trip.incident_note}</p>
                  </div>
                </div>
              )}

              {/* Timeline de Presença do Dia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-xs font-black text-neutral-500">
                    <Clock size={14} />
                    Status Atual
                  </div>
                  <p className="text-base font-black mt-1 text-neutral-900 dark:text-white">
                    {result.attendance?.status === 'embarcou'
                      ? 'A bordo do ônibus'
                      : result.attendance?.status === 'desembarcou'
                      ? 'Desembarcou com segurança'
                      : result.attendance?.status === 'faltou'
                      ? 'Não embarcou hoje'
                      : 'Aguardando embarque'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-300">
                    <UserCheck size={14} />
                    Embarque
                  </div>
                  <p className="text-base font-black mt-1 text-emerald-900 dark:text-emerald-100">
                    {formatTime(result.attendance?.boarded_at)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-300">
                    <CheckCircle2 size={14} />
                    Desembarque
                  </div>
                  <p className="text-base font-black mt-1 text-indigo-900 dark:text-indigo-100">
                    {formatTime(result.attendance?.disembarked_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Mapa ao vivo apenas durante viagem em andamento */}
            {result.trip?.status === 'em_andamento' && mapBus.length > 0 ? (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-600" />
                    Localização do Ônibus ({result.bus_location?.prefix})
                  </h3>
                  <span className="text-[11px] text-neutral-400">Atualiza automaticamente a cada 10s</span>
                </div>
                <LiveBusMap
                  buses={mapBus}
                  stops={mapStops}
                  selectedBusId="parent-bus"
                  heightClass="h-[340px]"
                  centerLat={mapBus[0].last_lat ?? undefined}
                  centerLng={mapBus[0].last_lng ?? undefined}
                  initialZoom={14}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                <Lock size={20} className="text-neutral-400" />
                <p className="font-bold text-neutral-700 dark:text-neutral-300">
                  Mapa em tempo real disponível apenas durante a viagem ativa
                </p>
                <p>Por segurança e privacidade (LGPD), a localização do veículo é ocultada após o encerramento da rota.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
