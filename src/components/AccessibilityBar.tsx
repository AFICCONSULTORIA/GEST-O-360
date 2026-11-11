import React, { useState, useEffect, useCallback } from 'react';
import {
  Contrast,
  Volume2,
  Square,
  RotateCcw,
  Hand,
  Type,
  Accessibility,
  Sun,
  Moon,
} from 'lucide-react';

declare global {
  interface Window {
    VLibras?: {
      Widget: new (url: string) => unknown;
    };
  }
}

export interface AccessibilityBarProps {
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  enableVLibras?: boolean;
  getReadAloudText?: () => string;
}

const FONT_OFFSETS: { offset: -2 | 0 | 2 | 4; label: string; title: string }[] = [
  { offset: -2, label: 'A-', title: 'Diminuir fonte' },
  { offset: 0, label: 'A', title: 'Fonte padrão' },
  { offset: 2, label: 'A+', title: 'Aumentar fonte' },
  { offset: 4, label: 'A++', title: 'Fonte ampliada máxima' },
];

export const AccessibilityBar: React.FC<AccessibilityBarProps> = ({
  darkMode,
  setDarkMode,
  enableVLibras = true,
  getReadAloudText,
}) => {
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('gestao360_site_contrast') === 'true';
  });

  const [fontSizeOffset, setFontSizeOffset] = useState<-2 | 0 | 2 | 4>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = Number(localStorage.getItem('gestao360_site_font_size'));
    return saved === -2 || saved === 0 || saved === 2 || saved === 4 ? saved : 0;
  });

  const [readableSpacing, setReadableSpacing] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('gestao360_site_readable_spacing') === 'true';
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [vlibrasReady, setVlibrasReady] = useState(false);

  // Aplica tamanho de fonte na raiz (rem)
  useEffect(() => {
    localStorage.setItem('gestao360_site_font_size', String(fontSizeOffset));
    const root = document.documentElement;
    root.style.fontSize = `${16 + fontSizeOffset}px`;
    return () => {
      root.style.fontSize = '';
    };
  }, [fontSizeOffset]);

  // Aplica alto contraste WCAG AAA / eMAG
  useEffect(() => {
    localStorage.setItem('gestao360_site_contrast', String(highContrast));
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('ouvidoria-high-contrast');
      document.body.classList.add('ouvidoria-high-contrast');
    } else {
      root.classList.remove('ouvidoria-high-contrast');
      document.body.classList.remove('ouvidoria-high-contrast');
    }
    return () => {
      root.classList.remove('ouvidoria-high-contrast');
      document.body.classList.remove('ouvidoria-high-contrast');
    };
  }, [highContrast]);

  // Aplica espaçamento ampliado (dislexia / baixa visão)
  useEffect(() => {
    localStorage.setItem('gestao360_site_readable_spacing', String(readableSpacing));
    const root = document.documentElement;
    if (readableSpacing) {
      root.classList.add('emag-readable-spacing');
    } else {
      root.classList.remove('emag-readable-spacing');
    }
    return () => {
      root.classList.remove('emag-readable-spacing');
    };
  }, [readableSpacing]);

  // Carrega widget oficial VLibras do Governo Federal
  useEffect(() => {
    if (!enableVLibras || typeof window === 'undefined') return;

    let wrapper = document.getElementById('gestao360-vlibras-root');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'gestao360-vlibras-root';
      wrapper.setAttribute('vw', '');
      wrapper.className = 'enabled';
      wrapper.innerHTML = `
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>
      `;
      document.body.appendChild(wrapper);
    } else {
      wrapper.style.display = '';
    }

    const initWidget = () => {
      try {
        if (window.VLibras && !document.body.dataset.vlibrasInitialized) {
          new window.VLibras.Widget('https://vlibras.gov.br/app');
          document.body.dataset.vlibrasInitialized = 'true';
        }
        setVlibrasReady(Boolean(window.VLibras));
      } catch {
        // offline ou bloqueado por rede
      }
    };

    if (window.VLibras) {
      initWidget();
    } else if (!document.getElementById('gestao360-vlibras-script')) {
      const script = document.createElement('script');
      script.id = 'gestao360-vlibras-script';
      script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      script.async = true;
      script.onload = initWidget;
      script.onerror = () => setVlibrasReady(false);
      document.body.appendChild(script);
    }

    return () => {
      const el = document.getElementById('gestao360-vlibras-root');
      if (el) el.style.display = 'none';
    };
  }, [enableVLibras]);

  // Encerra síntese de voz se sair da página
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text =
      (getReadAloudText && getReadAloudText()) ||
      document.getElementById('conteudo-principal')?.innerText?.slice(0, 1800) ||
      'Portal Institucional Oficial do Município.';

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.98;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, getReadAloudText]);

  const handleOpenVLibras = () => {
    const btn = document.querySelector('#gestao360-vlibras-root [vw-access-button]') as HTMLElement | null;
    if (btn) btn.click();
  };

  const handleReset = () => {
    setHighContrast(false);
    setFontSizeOffset(0);
    setReadableSpacing(false);
    if (isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const hasCustomization = highContrast || fontSizeOffset !== 0 || readableSpacing || isSpeaking;

  return (
    <>
      {/* Skip links invisíveis até focar por Tab */}
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-yellow-400 focus:text-black focus:font-black focus:shadow-xl"
      >
        Ir direto para o conteúdo principal
      </a>

      <nav
        aria-label="Barra de Acessibilidade"
        className="bg-neutral-950 text-neutral-200 border-b border-neutral-800 text-[11px] font-semibold"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2">
          {/* Atalhos rápidos eMAG (Alt + 1..4) */}
          <div className="hidden md:flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-black uppercase tracking-wider">
              <Accessibility size={13} />
              <span>Acessibilidade eMAG</span>
            </span>
            <a href="#conteudo-principal" accessKey="1" className="hover:text-white underline-offset-2 hover:underline">
              [1] Conteúdo
            </a>
            <a href="#menu-principal" accessKey="2" className="hover:text-white underline-offset-2 hover:underline">
              [2] Menu
            </a>
            <a href="#legislacao" accessKey="3" className="hover:text-white underline-offset-2 hover:underline">
              [3] Leis/Busca
            </a>
            <a href="#rodape" accessKey="4" className="hover:text-white underline-offset-2 hover:underline">
              [4] Rodapé
            </a>
          </div>

          {/* Controles interativos */}
          <div className="flex items-center flex-wrap gap-1.5 ml-auto">
            {/* Tamanho de fonte */}
            <div
              role="group"
              aria-label="Controle de tamanho de fonte"
              className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 overflow-hidden"
            >
              {FONT_OFFSETS.map((item) => {
                const active = fontSizeOffset === item.offset;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setFontSizeOffset(item.offset)}
                    aria-label={item.title}
                    aria-pressed={active}
                    title={item.title}
                    className={`px-2 py-1 text-[11px] font-black transition cursor-pointer ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Alto Contraste */}
            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              aria-pressed={highContrast}
              title="Alternar modo Alto Contraste (WCAG AAA)"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                highContrast
                  ? 'bg-yellow-400 text-black border-yellow-300 font-black'
                  : 'bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10'
              }`}
            >
              <Contrast size={12} />
              <span>Alto Contraste</span>
            </button>

            {/* Leitura Facilitada (Espaçamento) */}
            <button
              type="button"
              onClick={() => setReadableSpacing(!readableSpacing)}
              aria-pressed={readableSpacing}
              title="Aumentar espaçamento entre letras e linhas para facilitar a leitura"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                readableSpacing
                  ? 'bg-emerald-600 text-white border-emerald-500 font-black'
                  : 'bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10'
              }`}
            >
              <Type size={12} />
              <span className="hidden sm:inline">Leitura Ampliada</span>
            </button>

            {/* Síntese de Voz (pt-BR) */}
            {typeof window !== 'undefined' && 'speechSynthesis' in window && (
              <button
                type="button"
                onClick={handleToggleSpeech}
                aria-pressed={isSpeaking}
                title={isSpeaking ? 'Parar leitura em voz alta' : 'Ouvir resumo da página em voz alta'}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  isSpeaking
                    ? 'bg-amber-400 text-black border-amber-300 font-black'
                    : 'bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10'
                }`}
              >
                {isSpeaking ? <Square size={11} /> : <Volume2 size={12} />}
                <span>{isSpeaking ? 'Parar Voz' : 'Ouvir'}</span>
              </button>
            )}

            {/* VLibras */}
            {enableVLibras && (
              <button
                type="button"
                onClick={handleOpenVLibras}
                title={vlibrasReady ? 'Abrir tradutor VLibras' : 'Widget oficial VLibras (LIBRAS)'}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-200 border border-sky-500/30 transition cursor-pointer"
              >
                <Hand size={12} />
                <span>VLibras</span>
              </button>
            )}

            {/* Alternar Claro / Escuro */}
            {setDarkMode && (
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                aria-label={darkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
                title={darkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-neutral-200 hover:bg-white/10 transition cursor-pointer"
              >
                {darkMode ? <Sun size={12} /> : <Moon size={12} />}
              </button>
            )}

            {/* Restaurar padrão */}
            {hasCustomization && (
              <button
                type="button"
                onClick={handleReset}
                title="Restaurar padrão de acessibilidade"
                aria-label="Restaurar padrão de acessibilidade"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <RotateCcw size={11} />
                <span className="hidden sm:inline">Padrão</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default AccessibilityBar;

