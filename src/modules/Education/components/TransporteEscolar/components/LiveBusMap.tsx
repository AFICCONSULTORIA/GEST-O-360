import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bus, KeyRound, MapPin, RefreshCw, Satellite } from 'lucide-react';
import type { SchoolBus, SchoolStop } from '../types';
import {
  getGoogleMapsApiKey,
  loadGoogleMapsScript,
  saveLocalGoogleMapsApiKey,
  type GoogleMapInstance,
  type GoogleMapsLatLng,
  type GoogleMarkerInstance,
  type GooglePolylineInstance,
} from '../utils/googleMapsLoader';

interface LiveBusMapProps {
  buses: SchoolBus[];
  stops?: SchoolStop[];
  selectedBusId?: string | null;
  onSelectBus?: (busId: string) => void;
  onPickCoordinate?: (lat: number, lng: number) => void;
  pickedCoordinate?: GoogleMapsLatLng | null;
  heightClass?: string;
  centerLat?: number;
  centerLng?: number;
  initialZoom?: number;
}

export const LiveBusMap: React.FC<LiveBusMapProps> = ({
  buses,
  stops = [],
  selectedBusId,
  onSelectBus,
  onPickCoordinate,
  pickedCoordinate,
  heightClass = 'h-[420px]',
  centerLat,
  centerLng,
  initialZoom = 13,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const busMarkersRef = useRef<GoogleMarkerInstance[]>([]);
  const stopMarkersRef = useRef<GoogleMarkerInstance[]>([]);
  const pickedMarkerRef = useRef<GoogleMarkerInstance | null>(null);
  const polylineRef = useRef<GooglePolylineInstance | null>(null);

  const [apiKey, setApiKey] = useState<string>(() => getGoogleMapsApiKey());
  const [keyInput, setKeyInput] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const defaultCenter = useMemo<GoogleMapsLatLng>(() => {
    if (pickedCoordinate) return pickedCoordinate;
    if (centerLat != null && centerLng != null) {
      return { lat: centerLat, lng: centerLng };
    }
    const busWithPos = buses.find((b) => b.last_lat != null && b.last_lng != null);
    if (busWithPos && busWithPos.last_lat != null && busWithPos.last_lng != null) {
      return { lat: busWithPos.last_lat, lng: busWithPos.last_lng };
    }
    const stopWithPos = stops.find((s) => s.lat != null && s.lng != null);
    if (stopWithPos && stopWithPos.lat != null && stopWithPos.lng != null) {
      return { lat: stopWithPos.lat, lng: stopWithPos.lng };
    }
    return { lat: -16.6789, lng: -49.2552 };
  }, [buses, stops, centerLat, centerLng, pickedCoordinate]);

  // Inicializa o Google Maps quando houver chave
  useEffect(() => {
    if (!apiKey || !mapContainerRef.current) return;
    let cancelled = false;

    setMapError(null);
    loadGoogleMapsScript(apiKey)
      .then((g) => {
        if (cancelled || !mapContainerRef.current) return;
        const map = new g.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: initialZoom,
          mapTypeId: onPickCoordinate ? 'hybrid' : 'roadmap',
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapInstanceRef.current = map;
        setMapReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setMapReady(false);
          setMapError(err.message || 'Erro ao carregar Google Maps.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Listener de clique para capturar coordenadas
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !onPickCoordinate) return;

    const listener = map.addListener('click', (e) => {
      if (!e.latLng) return;
      const lat = Number(e.latLng.lat().toFixed(6));
      const lng = Number(e.latLng.lng().toFixed(6));
      onPickCoordinate(lat, lng);
    });

    return () => {
      listener.remove();
    };
  }, [mapReady, onPickCoordinate]);

  // Atualiza marcador de coordenada selecionada (modo picker)
  useEffect(() => {
    const g = window.google;
    const map = mapInstanceRef.current;
    if (!mapReady || !g || !map) return;

    if (pickedMarkerRef.current) {
      pickedMarkerRef.current.setMap(null);
      pickedMarkerRef.current = null;
    }

    if (pickedCoordinate) {
      pickedMarkerRef.current = new g.maps.Marker({
        position: pickedCoordinate,
        map,
        title: `Ponto selecionado (${pickedCoordinate.lat}, ${pickedCoordinate.lng})`,
        label: { text: 'NOVO', color: '#ffffff', fontWeight: 'bold', fontSize: '10px' },
      });
      map.panTo(pickedCoordinate);
    }
  }, [mapReady, pickedCoordinate]);

  // Atualiza pontos de referência e polilinha da rota
  useEffect(() => {
    const g = window.google;
    const map = mapInstanceRef.current;
    if (!mapReady || !g || !map) return;

    stopMarkersRef.current.forEach((m) => m.setMap(null));
    stopMarkersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const validStops = stops
      .filter((s) => s.lat != null && s.lng != null)
      .sort((a, b) => a.order_index - b.order_index);

    validStops.forEach((stop) => {
      const marker = new g.maps.Marker({
        position: { lat: stop.lat!, lng: stop.lng! },
        map,
        title: `${stop.order_index}. ${stop.name}`,
        label: {
          text: String(stop.order_index),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#4f46e5',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      stopMarkersRef.current.push(marker);
    });

    if (validStops.length >= 2) {
      polylineRef.current = new g.maps.Polyline({
        path: validStops.map((s) => ({ lat: s.lat!, lng: s.lng! })),
        geodesic: true,
        strokeColor: '#4f46e5',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map,
      });
    }
  }, [mapReady, stops]);

  // Atualiza marcadores dos ônibus em tempo real
  useEffect(() => {
    const g = window.google;
    const map = mapInstanceRef.current;
    if (!mapReady || !g || !map) return;

    busMarkersRef.current.forEach((m) => m.setMap(null));
    busMarkersRef.current = [];

    buses
      .filter((b) => b.last_lat != null && b.last_lng != null)
      .forEach((bus) => {
        const isOnline = bus.tracker_status === 'online' || bus.tracker_status === 'simulado';
        const isSelected = selectedBusId === bus.id;
        const marker = new g.maps.Marker({
          position: { lat: bus.last_lat!, lng: bus.last_lng! },
          map,
          title: `${bus.prefix} (${bus.plate}) • ${Math.round(bus.last_speed_kmh || 0)} km/h`,
          label: {
            text: bus.prefix,
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '10px',
          },
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 18 : 15,
            fillColor: isOnline ? '#059669' : '#d97706',
            fillOpacity: 1,
            strokeColor: isSelected ? '#4f46e5' : '#ffffff',
            strokeWeight: isSelected ? 3 : 2,
          },
        });

        const info = new g.maps.InfoWindow({
          content: `<div style="font-family:sans-serif;padding:4px;color:#111">
            <strong>${bus.prefix} • ${bus.plate}</strong><br/>
            <span>Motorista: ${bus.driver_name || '—'}</span><br/>
            <span>Velocidade: ${Math.round(bus.last_speed_kmh || 0)} km/h</span>
          </div>`,
        });

        marker.addListener('click', () => {
          onSelectBus?.(bus.id);
          info.open({ anchor: marker, map });
        });

        busMarkersRef.current.push(marker);
      });
  }, [mapReady, buses, selectedBusId, onSelectBus]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    saveLocalGoogleMapsApiKey(keyInput.trim());
    setApiKey(keyInput.trim());
  };

  if (!apiKey) {
    return (
      <div
        className={`w-full ${heightClass} rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-neutral-900 flex flex-col items-center justify-center p-6 text-center`}
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md mb-3">
          <Satellite size={24} />
        </div>
        <h4 className="text-sm font-black text-neutral-900 dark:text-white">
          Configurar Google Maps API
        </h4>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mt-1">
          Para visualizar o mapa do Google (Satélite/Ruas) e clicar para marcar coordenadas dos pontos,
          defina <code className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 font-mono">VITE_GOOGLE_MAPS_API_KEY</code> no{' '}
          <code className="font-mono">.env</code> ou cole a chave abaixo para testar agora:
        </p>

        <form onSubmit={handleSaveKey} className="mt-4 flex flex-col sm:flex-row gap-2 w-full max-w-md">
          <div className="relative flex-1">
            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Cole sua Google Maps API Key (AIza...)"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer"
          >
            Ativar Mapa
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
            <RefreshCw size={15} className="animate-spin text-indigo-600" />
            Carregando Google Maps...
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-50/95 dark:bg-neutral-900/95 p-6 text-center gap-2">
          <p className="text-xs font-black text-rose-700 dark:text-rose-300">{mapError}</p>
          <button
            type="button"
            onClick={() => {
              saveLocalGoogleMapsApiKey('');
              setApiKey('');
              setMapError(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
          >
            Trocar Chave API
          </button>
        </div>
      )}

      {/* Barra de Legenda / Dica de clique */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-wrap items-center gap-3 text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
        {onPickCoordinate ? (
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            <MapPin size={12} />
            Clique no mapa (use Satélite para zona rural) para preencher Latitude e Longitude
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <Bus size={12} className="text-emerald-600" />
              GPS Online
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              Sem Sinal
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-indigo-600" />
              Pontos da Rota
            </span>
          </>
        )}
      </div>
    </div>
  );
};
