import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ExternalLink,
  Megaphone,
  Clock,
} from 'lucide-react';
import {
  SitePopupItem,
  clampPopupDuration,
  DEFAULT_POPUP_DURATION_SECONDS,
} from '../lib/api/institutionalSite';

interface SitePopupCarouselModalProps {
  open: boolean;
  items: SitePopupItem[];
  autoplay?: boolean;
  autoCloseSeconds?: number;
  darkMode?: boolean;
  isMourning?: boolean;
  accentHex?: string;
  institutionName?: string;
  onClose: () => void;
  onSlideChange?: (item: SitePopupItem, index: number) => void;
}

export const SitePopupCarouselModal: React.FC<SitePopupCarouselModalProps> = ({
  open,
  items,
  autoplay = true,
  autoCloseSeconds = 0,
  darkMode = false,
  isMourning = false,
  accentHex = '#059669',
  institutionName = 'Prefeitura Municipal',
  onClose,
  onSlideChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remainingAutoClose, setRemainingAutoClose] = useState<number>(autoCloseSeconds);

  const total = items.length;
  const safeIndex = total > 0 ? currentIndex % total : 0;
  const currentItem = total > 0 ? items[safeIndex] : null;
  const currentDuration = currentItem
    ? clampPopupDuration(currentItem.durationSeconds)
    : DEFAULT_POPUP_DURATION_SECONDS;

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setProgress(0);
      setPaused(false);
      setRemainingAutoClose(autoCloseSeconds > 0 ? autoCloseSeconds : 0);
    }
  }, [open, autoCloseSeconds, total]);

  useEffect(() => {
    if (open && currentItem && onSlideChange) {
      onSlideChange(currentItem, safeIndex);
    }
  }, [open, safeIndex, currentItem?.id]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
    setProgress(0);
  }, [total]);

  const goPrev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    setProgress(0);
  }, [total]);

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(idx);
    setProgress(0);
  }, []);

  // Avanço automático respeitando a duração individual (em segundos) de cada slide
  useEffect(() => {
    if (!open || !currentItem || !autoplay || paused || hovered || total <= 1) {
      return;
    }

    const durationMs = currentDuration * 1000;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      if (elapsed >= durationMs) {
        window.clearInterval(interval);
        setCurrentIndex((prev) => (prev + 1) % total);
        setProgress(0);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [open, currentItem?.id, currentDuration, autoplay, paused, hovered, total, safeIndex]);

  // Fechamento automático global (quando configurado > 0)
  useEffect(() => {
    if (!open || autoCloseSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRemainingAutoClose((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, autoCloseSeconds, onClose]);

  // Navegação por teclado (Setas / ESC)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, goNext, goPrev]);

  if (typeof document === 'undefined') return null;

  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url.trim());

  const modalTree = (
    <div className={darkMode ? 'dark' : ''}>
      <AnimatePresence>
        {open && currentItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto ${
              isMourning ? 'grayscale' : ''
            }`}
            onClick={onClose}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="site-popup-carousel-title"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-auto"
            >
              {/* Barra superior de progresso do slide atual */}
              {total > 1 && autoplay && (
                <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full transition-[width] duration-75 ease-linear"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: accentHex,
                    }}
                  />
                </div>
              )}

              {/* Cabeçalho do Carrossel */}
              <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shrink-0"
                    style={{ backgroundColor: accentHex }}
                  >
                    <Megaphone size={11} />
                    <span>{currentItem.badge?.trim() || 'Comunicado Oficial'}</span>
                  </span>
                  {total > 1 && (
                    <span className="text-[11px] font-black text-neutral-500 dark:text-neutral-400">
                      {safeIndex + 1} / {total}
                    </span>
                  )}
                  {autoCloseSeconds > 0 && remainingAutoClose > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-neutral-400">
                      <Clock size={11} />
                      <span>Fecha em {remainingAutoClose}s</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {total > 1 && autoplay && (
                    <button
                      type="button"
                      onClick={() => setPaused((p) => !p)}
                      title={paused ? 'Retomar carrossel' : 'Pausar carrossel'}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
                    >
                      {paused ? <Play size={12} /> : <Pause size={12} />}
                      <span className="hidden sm:inline">{currentDuration}s</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar pop-up informativo"
                    className="p-1.5 rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Conteúdo do Slide */}
              <div className="relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentItem.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="max-h-[70vh] overflow-y-auto"
                  >
                    {currentItem.imageUrl?.trim() && (
                      <div className="relative w-full aspect-video bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center border-b border-neutral-100 dark:border-neutral-800 overflow-hidden">
                        <img
                          src={currentItem.imageUrl}
                          alt={currentItem.title || 'Informativo Municipal'}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    {(currentItem.title?.trim() ||
                      currentItem.description?.trim() ||
                      (currentItem.actionLabel?.trim() && currentItem.actionUrl?.trim())) && (
                      <div className="p-5 sm:p-6 space-y-3">
                        {currentItem.title?.trim() && (
                          <h3
                            id="site-popup-carousel-title"
                            className="text-lg sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white leading-snug"
                          >
                            {currentItem.title}
                          </h3>
                        )}

                        {currentItem.description?.trim() && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                            {currentItem.description}
                          </p>
                        )}

                        {currentItem.actionUrl?.trim() && (
                          <div className="pt-2">
                            <a
                              href={currentItem.actionUrl.trim()}
                              target={isExternalUrl(currentItem.actionUrl) ? '_blank' : undefined}
                              rel={
                                isExternalUrl(currentItem.actionUrl)
                                  ? 'noopener noreferrer'
                                  : undefined
                              }
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-black shadow-lg transition hover:opacity-90"
                              style={{ backgroundColor: accentHex }}
                            >
                              <span>{currentItem.actionLabel?.trim() || 'Saiba Mais'}</span>
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Setas de Navegação do Carrossel */}
                {total > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Aviso anterior"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white shadow-md flex items-center justify-center hover:scale-105 transition cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Próximo aviso"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white shadow-md flex items-center justify-center hover:scale-105 transition cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Rodapé com indicadores de paginação e botão Fechar */}
              <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                  {institutionName}
                </span>

                {total > 1 && (
                  <div className="flex items-center gap-1.5">
                    {items.map((item, idx) => {
                      const active = idx === safeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => goTo(idx)}
                          aria-label={`Ir para aviso ${idx + 1}: ${item.title || 'Comunicado'}`}
                          className={`h-2.5 rounded-full transition-all cursor-pointer ${
                            active
                              ? 'w-7'
                              : 'w-2.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
                          }`}
                          style={active ? { backgroundColor: accentHex } : undefined}
                        />
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-black text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(modalTree, document.body);
};

export default SitePopupCarouselModal;

