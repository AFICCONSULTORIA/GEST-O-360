import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const LazyApp = lazy(() => import('./App.tsx'));
const LazyPublicDeclarationForm = lazy(() =>
  import('./pages/PublicDeclarationForm').then((m) => ({
    default: m.PublicDeclarationForm,
  }))
);

function isDirectQrDeclarationPath(): boolean {
  if (typeof window === 'undefined') return false;
  const pathLower = decodeURIComponent(window.location.pathname || '/').toLowerCase();
  const segments = pathLower.split('/').filter(Boolean);
  const params = new URLSearchParams(window.location.search);
  return (
    segments.includes('declaracao') ||
    segments.includes('declaracao-participacao') ||
    params.has('evento')
  );
}

const FastFallback = () => (
  <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
      Abrindo formulário de participação...
    </p>
  </div>
);

const isQrDeclaration = isDirectQrDeclarationPath();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<FastFallback />}>
      {isQrDeclaration ? <LazyPublicDeclarationForm /> : <LazyApp />}
    </Suspense>
  </StrictMode>
);
