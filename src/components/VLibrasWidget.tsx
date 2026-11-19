import React, { useEffect } from 'react';

declare global {
  interface Window {
    VLibras?: {
      Widget: new (url: string) => unknown;
    };
  }
}

export interface VLibrasWidgetProps {
  enabled?: boolean;
}

/**
 * Widget oficial VLibras do Governo Federal (https://vlibras.gov.br/app).
 * Garante tradução automática em LIBRAS em todas as rotas públicas do portal.
 */
export const VLibrasWidget: React.FC<VLibrasWidgetProps> = ({ enabled = true }) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

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
      } catch {
        // Silencioso caso o ambiente esteja offline ou bloqueado por CSP local
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
      document.body.appendChild(script);
    }

    return () => {
      const el = document.getElementById('gestao360-vlibras-root');
      if (el) el.style.display = 'none';
    };
  }, [enabled]);

  return null;
};

export default VLibrasWidget;
