import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pipette } from 'lucide-react';

interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h >= 0 && h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h >= 60 && h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h >= 120 && h < 180) [r1, g1, b1] = [0, c, x];
  else if (h >= 180 && h < 240) [r1, g1, b1] = [0, x, c];
  else if (h >= 240 && h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { h: 160, s: 0.9, v: 0.6 };

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

const DEFAULT_PRESETS = [
  '#059669', // Esmeralda
  '#0284c7', // Azul Institucional
  '#1d4ed8', // Azul Royal
  '#4f46e5', // Índigo
  '#b91c1c', // Carmesim
  '#d97706', // Dourado / Âmbar
  '#0f766e', // Petróleo
  '#1e293b', // Grafite
];

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [hsv, setHsv] = useState(() => hexToHsv(value || '#059669'));
  const [hexInput, setHexInput] = useState(value || '#059669');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsv(hexToHsv(value));
      setHexInput(value.toUpperCase());
    }
  }, [value]);

  const emitFromHsv = useCallback(
    (next: { h: number; s: number; v: number }) => {
      setHsv(next);
      const [r, g, b] = hsvToRgb(next.h, next.s, next.v);
      const hex = rgbToHex(r, g, b);
      setHexInput(hex.toUpperCase());
      onChange(hex);
    },
    [onChange]
  );

  const pickAtClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const radius = rect.width / 2;
      const dx = clientX - (rect.left + radius);
      const dy = clientY - (rect.top + radius);
      const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;
      const s = clamp(dist / radius, 0, 1);
      emitFromHsv({ h: angle, s, v: hsv.v < 0.2 ? 0.85 : hsv.v });
    },
    [emitFromHsv, hsv.v]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => pickAtClientPoint(e.clientX, e.clientY);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, pickAtClientPoint]);

  // Posição do marcador no círculo cromático
  const angleRad = ((hsv.h - 90) * Math.PI) / 180;
  const indicatorRadiusPct = hsv.s * 50;
  const indicatorX = 50 + indicatorRadiusPct * Math.cos(angleRad);
  const indicatorY = 50 + indicatorRadiusPct * Math.sin(angleRad);

  const handleHexChange = (raw: string) => {
    setHexInput(raw);
    const clean = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      const parsed = hexToHsv(clean);
      setHsv(parsed);
      onChange(clean.toLowerCase());
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Círculo Cromático Interativo 360° */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div
            ref={wheelRef}
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging(true);
              pickAtClientPoint(e.clientX, e.clientY);
            }}
            role="slider"
            aria-label="Círculo cromático de seleção de cor do site"
            aria-valuetext={hexInput}
            tabIndex={0}
            className="relative w-44 h-44 rounded-full cursor-crosshair shadow-inner ring-4 ring-white dark:ring-neutral-800 select-none touch-none"
            style={{
              background:
                'radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0) 70%), conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              filter: `brightness(${0.3 + hsv.v * 0.7})`,
            }}
          >
            <div
              className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `${indicatorX}%`,
                top: `${indicatorY}%`,
                backgroundColor: value,
              }}
            />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Clique ou arraste no círculo
          </span>
        </div>

        {/* Controles Complementares: Brilho, HEX, Nativo e Presets */}
        <div className="flex-1 w-full space-y-3.5">
          <div>
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              <span>Luminosidade / Profundidade</span>
              <span>{Math.round(hsv.v * 100)}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={Math.round(hsv.v * 100)}
              onChange={(e) =>
                emitFromHsv({
                  ...hsv,
                  v: Number(e.target.value) / 100,
                })
              }
              className="w-full accent-neutral-900 dark:accent-white cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                Código HEX
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-700 shrink-0 shadow-sm"
                  style={{ backgroundColor: value }}
                />
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  maxLength={7}
                  placeholder="#059669"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                Conta-gotas / Seletor OS
              </label>
              <label className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <Pipette size={13} />
                <span>Abrir Seletor</span>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#059669'}
                  onChange={(e) => onChange(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
              Sugestões Institucionais
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => {
                const selected = preset.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChange(preset)}
                    title={preset}
                    className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                      selected
                        ? 'border-neutral-900 dark:border-white scale-110 shadow-md'
                        : 'border-white dark:border-neutral-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorWheelPicker;

