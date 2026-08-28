import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface LogoCompassProps {
  size?: number;
  className?: string;
  variant?: 'emerald' | 'indigo' | 'blue';
}

export const LogoCompass: React.FC<LogoCompassProps> = ({ 
  size = 32, 
  className = ''
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Apply scaling multiplier
  const displaySize = Math.max(Math.round(size * 1.45), 34);

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    if (isExpanded) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (hasError) {
    // High quality fallback SVG Planet logo
    return (
      <svg 
        width={displaySize} 
        height={displaySize} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={`shrink-0 ${className}`}
      >
        <defs>
          <linearGradient id="fallback-planet-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="fallback-ring-grad" x1="2" y1="16" x2="30" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <path d="M 5 21 C 8 13, 22 10, 27 13" stroke="url(#fallback-ring-grad)" strokeWidth="2.5" opacity="0.5" />
        <circle cx="16" cy="16" r="9.5" fill="url(#fallback-planet-grad)" />
        <path d="M 4 19.5 C 7 24.5, 25 24.5, 28 17.5" stroke="url(#fallback-ring-grad)" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="25.5" cy="19.5" r="2" fill="white" />
      </svg>
    );
  }

  const modal = typeof document !== 'undefined' && createPortal(
    <AnimatePresence>
      {isExpanded && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8"
          onClick={() => setIsExpanded(false)}
        >
          {/* Botão Fechar */}
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all duration-300"
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
          >
            <X size={24} />
          </button>

          {/* Imagem em Tela Cheia */}
          <motion.img 
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            src="/logo-planet.png" 
            alt="Gestão 360 Logo - Full"
            className="w-full max-w-3xl max-h-[85vh] object-contain drop-shadow-[0_0_80px_rgba(217,119,6,0.5)] rounded-3xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      <div 
        onClick={() => setIsExpanded(true)}
        style={{ width: displaySize, height: displaySize }}
        className={`relative overflow-hidden rounded-2xl shrink-0 cursor-pointer flex items-center justify-center group bg-neutral-950 shadow-md ${className}`}
      >
        <img 
          src="/logo-planet.png" 
          alt="Gestão 360 Logo"
          onError={() => setHasError(true)}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      {modal}
    </>
  );
};
