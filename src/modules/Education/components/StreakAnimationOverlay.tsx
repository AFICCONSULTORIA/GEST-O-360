import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles } from 'lucide-react';

interface StreakAnimationOverlayProps {
  prevStreak: number;
  currentStreak: number;
  onClose: () => void;
}

export const StreakAnimationOverlay: React.FC<StreakAnimationOverlayProps> = ({
  prevStreak,
  currentStreak,
  onClose,
}) => {
  const [displayNumber, setDisplayNumber] = useState(prevStreak);
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    // Sequence: 
    // 1. Show prevStreak for 1.5 second.
    // 2. Animate up to currentStreak.
    // 3. Explode confetti/flames.
    
    const t1 = setTimeout(() => {
      setDisplayNumber(currentStreak);
      setIsExploding(true);
    }, 1500);

    return () => clearTimeout(t1);
  }, [currentStreak]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-neutral-900/90 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="bg-white dark:bg-neutral-900 rounded-[40px] p-8 md:p-12 max-w-sm w-full shadow-2xl shadow-orange-500/20 flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Confetti/Rays Background when exploding */}
          {isExploding && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.5], opacity: [1, 0] }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-400/40 via-transparent to-transparent pointer-events-none"
            />
          )}

          <div className="relative mb-6">
            <motion.div
              animate={isExploding ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.8 }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/40 ring-8 ring-orange-500/20"
            >
              <Flame size={64} className="text-white drop-shadow-md" fill="currentColor" />
            </motion.div>
            
            {isExploding && (
              <>
                <motion.div 
                  initial={{ opacity: 0, y: 0, x: -20 }} 
                  animate={{ opacity: [0, 1, 0], y: -50, x: -40 }} 
                  transition={{ duration: 1 }} 
                  className="absolute top-0 left-0 text-amber-400"
                >
                  <Sparkles size={24} />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 0, x: 20 }} 
                  animate={{ opacity: [0, 1, 0], y: -40, x: 50 }} 
                  transition={{ duration: 1, delay: 0.2 }} 
                  className="absolute top-4 right-0 text-orange-400"
                >
                  <Sparkles size={32} />
                </motion.div>
              </>
            )}
          </div>

          <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">
            Sequência Diária!
          </h2>
          <p className="text-neutral-500 font-medium mb-8">
            Você completou sua primeira atividade do dia. Continue assim!
          </p>

          <div className="flex items-baseline gap-2 mb-8">
            <motion.div
              key={displayNumber}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-6xl font-black ${isExploding ? 'text-orange-500' : 'text-neutral-400'} drop-shadow-sm`}
            >
              {displayNumber}
            </motion.div>
            <span className="text-xl font-bold text-neutral-400">dias</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-colors"
          >
            Continuar
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
