import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    __deferredInstallPrompt?: Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e as Window['__deferredInstallPrompt'];
  window.dispatchEvent(new Event('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  window.__deferredInstallPrompt = undefined;
});

const ModuleFallback = () => (
  <div className="min-h-dvh bg-[#F9F9F8] dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-10 h-10 border-4 border-neutral-900/10 dark:border-white/10 border-t-neutral-900 dark:border-t-white rounded-full animate-spin mb-3" />
    <p className="text-xs font-black uppercase tracking-widest text-neutral-400">
      Carregando...
    </p>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<ModuleFallback />}>
      <App />
    </Suspense>
  </StrictMode>
);
