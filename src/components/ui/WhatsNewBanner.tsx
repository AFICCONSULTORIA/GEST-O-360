import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';

interface WhatsNewBannerProps {
  version: string;
  title: string;
  features: string[];
}

export const WhatsNewBanner: React.FC<WhatsNewBannerProps> = ({ version, title, features }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('last_seen_version');
    if (lastSeenVersion !== version) {
      setIsVisible(true);
    }
  }, [version]);

  const handleDismiss = () => {
    localStorage.setItem('last_seen_version', version);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[32px] p-8 shadow-2xl shadow-emerald-600/20 mb-8 relative overflow-hidden"
        >
          {/* Fundo Decorativo */}
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
            <Sparkles size={160} />
          </div>
          <div className="absolute bottom-0 left-0 p-8 opacity-5 pointer-events-none transform -translate-x-4 translate-y-4">
            <Sparkles size={100} />
          </div>
          
          <button 
            onClick={handleDismiss}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white backdrop-blur-sm"
          >
            <X size={20} />
          </button>

          <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-6">
            <div className="hidden md:flex p-4 bg-white/20 rounded-2xl text-white backdrop-blur-sm shrink-0 w-max">
              <Sparkles size={32} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-white text-emerald-700 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-full shadow-sm">
                  Nova Versão {version}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">{title}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 bg-black/10 backdrop-blur-sm rounded-2xl p-4 text-white">
                    <CheckCircle2 size={18} className="text-emerald-200 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium leading-relaxed text-emerald-50">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-4">
                <button 
                  onClick={handleDismiss}
                  className="px-8 py-4 bg-white text-emerald-900 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-50 hover:scale-[1.02] transition-all shadow-xl shadow-black/10 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> Entendi, fechar aviso
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
