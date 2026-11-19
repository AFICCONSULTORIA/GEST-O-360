const LOCAL_KEY_STORAGE = 'gestao360_google_maps_api_key';

export interface GoogleMapsLatLng {
  lat: number;
  lng: number;
}

export interface GoogleMapInstance {
  setCenter: (center: GoogleMapsLatLng) => void;
  setZoom: (zoom: number) => void;
  panTo: (center: GoogleMapsLatLng) => void;
  addListener: (eventName: string, handler: (e: { latLng?: { lat: () => number; lng: () => number } }) => void) => {
    remove: () => void;
  };
}

export interface GoogleMarkerInstance {
  setMap: (map: GoogleMapInstance | null) => void;
  setPosition: (pos: GoogleMapsLatLng) => void;
  addListener: (eventName: string, handler: () => void) => void;
}

export interface GooglePolylineInstance {
  setMap: (map: GoogleMapInstance | null) => void;
}

export interface GoogleInfoWindowInstance {
  open: (options: { anchor: GoogleMarkerInstance; map: GoogleMapInstance }) => void;
  close: () => void;
}

export interface GoogleMapsNamespace {
  maps: {
    Map: new (
      el: HTMLElement,
      opts: {
        center: GoogleMapsLatLng;
        zoom: number;
        mapTypeId?: string;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
      }
    ) => GoogleMapInstance;
    Marker: new (opts: {
      position: GoogleMapsLatLng;
      map: GoogleMapInstance;
      title?: string;
      label?: string | { text: string; color?: string; fontWeight?: string; fontSize?: string };
      icon?: unknown;
      draggable?: boolean;
    }) => GoogleMarkerInstance;
    Polyline: new (opts: {
      path: GoogleMapsLatLng[];
      geodesic?: boolean;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      map?: GoogleMapInstance;
    }) => GooglePolylineInstance;
    InfoWindow: new (opts: { content: string }) => GoogleInfoWindowInstance;
    SymbolPath: {
      CIRCLE: number;
      FORWARD_CLOSED_ARROW: number;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
  }
}

export function getGoogleMapsApiKey(): string {
  const envKey = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();

  try {
    return localStorage.getItem(LOCAL_KEY_STORAGE)?.trim() || '';
  } catch {
    return '';
  }
}

export function saveLocalGoogleMapsApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(LOCAL_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(LOCAL_KEY_STORAGE);
    }
  } catch {
    // ignore
  }
}

let loadPromise: Promise<GoogleMapsNamespace> | null = null;
let loadedKey = '';

export function loadGoogleMapsScript(apiKey: string): Promise<GoogleMapsNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps só pode ser carregado no navegador.'));
  }

  if (window.google?.maps && loadedKey === apiKey) {
    return Promise.resolve(window.google);
  }

  if (loadPromise && loadedKey === apiKey) {
    return loadPromise;
  }

  loadedKey = apiKey;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gestao360-gmaps="true"]');
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=pt-BR&region=BR`;
    script.async = true;
    script.defer = true;
    script.dataset.gestao360Gmaps = 'true';

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        loadPromise = null;
        reject(new Error('Google Maps API carregou sem inicializar window.google.maps.'));
      }
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Falha ao carregar o script do Google Maps. Verifique a chave de API.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
