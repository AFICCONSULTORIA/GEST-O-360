import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMsg { 
  id: number; 
  message: string; 
  type: ToastType; 
}

const toastEmitter = {
  listeners: [] as ((toast: ToastMsg) => void)[],
  emit(message: string, type: ToastType = 'info') {
    const toast = { id: Date.now(), message, type };
    this.listeners.forEach(l => l(toast));
  },
  subscribe(listener: (toast: ToastMsg) => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }
};

export const showToast = (message: string, type: ToastType = 'info') => toastEmitter.emit(message, type);

export const ToastContainer = () => {
  const [toasts, setToasts] = React.useState<ToastMsg[]>([]);

  React.useEffect(() => {
    const unsub = toastEmitter.subscribe(toast => {
      setToasts(prev => {
        // Evita duplicar a mesma mensagem se já estiver visível e mantém no máximo 2 avisos minimalistas
        const withoutDuplicate = prev.filter(t => t.message !== toast.message);
        return [...withoutDuplicate.slice(-1), toast];
      });
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 3200);
    });
    return unsub;
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-1.5 pointer-events-none max-w-sm">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div 
            key={t.id} 
            initial={{ opacity: 0, y: 12, scale: 0.96 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }} 
            className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl shadow-lg border backdrop-blur-md ${
              t.type === 'error' ? 'bg-rose-950/90 border-rose-800/60 text-rose-100' :
              t.type === 'success' ? 'bg-neutral-900/95 border-emerald-500/40 text-white dark:bg-neutral-900/95' :
              t.type === 'warning' ? 'bg-amber-950/90 border-amber-800/60 text-amber-100' :
              'bg-neutral-900/90 border-neutral-800 text-neutral-100'
            }`}
          >
             {t.type === 'error' && <XCircle size={16} className="text-rose-400 shrink-0" />}
             {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
             {t.type === 'info' && <Info size={16} className="text-blue-400 shrink-0" />}
             {t.type === 'warning' && <AlertTriangle size={16} className="text-amber-400 shrink-0" />}
             <span className="text-xs font-semibold leading-snug flex-1 line-clamp-2">{t.message}</span>
             <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="p-0.5 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"><X size={13} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
