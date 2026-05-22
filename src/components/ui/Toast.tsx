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
      setToasts(prev => [...prev, toast]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 4000);
    });
    return unsub;
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div 
            key={t.id} 
            initial={{ opacity: 0, y: 20, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} 
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
              t.type === 'error' ? 'bg-rose-50/90 border-rose-100 text-rose-800 dark:bg-rose-950/90 dark:border-rose-900/50 dark:text-rose-200' :
              t.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900/50 dark:text-emerald-200' :
              t.type === 'warning' ? 'bg-amber-50/90 border-amber-100 text-amber-800 dark:bg-amber-950/90 dark:border-amber-900/50 dark:text-amber-200' :
              'bg-white/90 border-neutral-100 text-neutral-800 dark:bg-neutral-900/90 dark:border-neutral-800 dark:text-neutral-200'
            }`}
          >
             {t.type === 'error' && <XCircle size={24} className="text-rose-500" />}
             {t.type === 'success' && <CheckCircle2 size={24} className="text-emerald-500" />}
             {t.type === 'info' && <Info size={24} className="text-blue-500" />}
             {t.type === 'warning' && <AlertTriangle size={24} className="text-amber-500" />}
             <span className="text-sm font-bold flex-1">{t.message}</span>
             <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-3 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"><X size={16} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
