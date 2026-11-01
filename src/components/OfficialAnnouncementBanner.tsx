import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, AlertTriangle, ShieldAlert, CheckCircle2, 
  ExternalLink, ChevronLeft, ChevronRight, X, Clock, CheckCheck
} from 'lucide-react';
import { AdminUser, Institution, PlatformAnnouncement } from '../types';
import { fetchActiveAnnouncementsForUser } from '../services/platformAdminService';

interface OfficialAnnouncementBannerProps {
  currentUser: AdminUser | null;
  currentInstitution: Institution | null;
  /** Permite forçar abertura manual (ex: clique no sino de comunicados) */
  forceOpenAnnouncement?: PlatformAnnouncement | null;
  onClose?: () => void;
}

export const OfficialAnnouncementBanner: React.FC<OfficialAnnouncementBannerProps> = ({
  currentUser,
  currentInstitution,
  forceOpenAnnouncement,
  onClose
}) => {
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Carrega comunicados no login do usuário
  useEffect(() => {
    if (!currentUser) return;

    const loadAnnouncements = async () => {
      const activeList = await fetchActiveAnnouncementsForUser(currentInstitution?.id);

      // Filtra apenas comunicados com show_login_banner ativado
      // e que ainda não foram marcados como cientes pelo usuário
      const unreadList = activeList.filter(item => {
        // Se show_login_banner for explicitamente falso, não exibe no login
        if (item.show_login_banner === false) return false;

        const seenKey = `gestao360_announcement_seen_${item.id}_usr_${currentUser.id}`;
        return localStorage.getItem(seenKey) !== 'true';
      });

      if (unreadList.length > 0) {
        setAnnouncements(unreadList);
        setCurrentIndex(0);
        setIsOpen(true);
      }
    };

    loadAnnouncements();
  }, [currentUser, currentInstitution]);

  // Se receber um comunicado específico forçado (ex: clique no menu)
  useEffect(() => {
    if (forceOpenAnnouncement) {
      setAnnouncements([forceOpenAnnouncement]);
      setCurrentIndex(0);
      setIsOpen(true);
    }
  }, [forceOpenAnnouncement]);

  // Ouve evento global para reabrir comunicados a qualquer momento
  useEffect(() => {
    const handleReopen = async (e: Event) => {
      const customEvent = e as CustomEvent<PlatformAnnouncement[] | undefined>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setAnnouncements(customEvent.detail);
        setCurrentIndex(0);
        setIsOpen(true);
      } else {
        const activeList = await fetchActiveAnnouncementsForUser(currentInstitution?.id);
        if (activeList.length > 0) {
          setAnnouncements(activeList);
          setCurrentIndex(0);
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('gestao360:open_announcements', handleReopen);
    return () => window.removeEventListener('gestao360:open_announcements', handleReopen);
  }, [currentInstitution]);

  const currentItem = announcements[currentIndex];

  const handleAcknowledge = () => {
    if (!currentItem || !currentUser) {
      handleClose();
      return;
    }

    // Registra ciência no localStorage do usuário
    const seenKey = `gestao360_announcement_seen_${currentItem.id}_usr_${currentUser.id}`;
    localStorage.setItem(seenKey, 'true');

    // Se houver mais comunicados pendentes na fila, avança
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen || !currentItem) return null;

  const getPriorityStyle = (priority: PlatformAnnouncement['priority']) => {
    switch (priority) {
      case 'critica':
        return {
          badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          badgeText: 'Crítico · Urgência Imediata',
          cardBorder: 'border-rose-500/40 shadow-rose-500/10',
          headerGlow: 'from-rose-500/10 to-transparent',
          icon: <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
        };
      case 'alta':
        return {
          badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          badgeText: 'Alta Prioridade',
          cardBorder: 'border-amber-500/40 shadow-amber-500/10',
          headerGlow: 'from-amber-500/10 to-transparent',
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />
        };
      case 'baixa':
        return {
          badgeBg: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/30',
          badgeText: 'Informativo Oficial',
          cardBorder: 'border-neutral-200 dark:border-neutral-800 shadow-neutral-500/5',
          headerGlow: 'from-neutral-500/10 to-transparent',
          icon: <Bell className="w-4 h-4 text-neutral-400" />
        };
      default:
        return {
          badgeBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
          badgeText: 'Comunicado Oficial',
          cardBorder: 'border-sky-500/30 shadow-sky-500/10',
          headerGlow: 'from-sky-500/10 to-transparent',
          icon: <Bell className="w-4 h-4 text-sky-400" />
        };
    }
  };

  const priorityStyle = getPriorityStyle(currentItem.priority);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-neutral-950/75 backdrop-blur-md animate-in fade-in duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className={`relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border ${priorityStyle.cardBorder} shadow-2xl overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Glow */}
          <div className={`h-2.5 w-full bg-gradient-to-r ${
            currentItem.priority === 'critica'
              ? 'from-rose-500 via-amber-500 to-rose-600'
              : currentItem.priority === 'alta'
              ? 'from-amber-400 via-amber-500 to-amber-600'
              : 'from-amber-500 via-sky-500 to-emerald-500'
          }`} />

          {/* Botão Fechar Rápido */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition z-10 cursor-pointer"
            title="Fechar comunicado"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Cabeçalho Institucional AFIC */}
          <div className="p-6 sm:p-7 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-start gap-4 pr-8">
              {/* Logo Oficial AFIC / Gestão 360 */}
              <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 shadow-md p-1.5 overflow-hidden">
                {!imgError ? (
                  <img
                    src={currentItem.logo_url || '/logo-gestao360.png'}
                    alt="AFIC Consultoria · Gestão 360"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-amber-500 font-black text-xs">
                    <span>AFIC</span>
                    <span className="text-[9px] text-amber-400/80 font-mono">360</span>
                  </div>
                )}
              </div>

              {/* Títulos e Identificação Governamental */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                    AFIC CONSULTORIA & TECNOLOGIA
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 font-mono ${priorityStyle.badgeBg}`}>
                    {priorityStyle.icon}
                    {priorityStyle.badgeText}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white tracking-tight leading-snug">
                  {currentItem.title}
                </h3>
              </div>
            </div>
          </div>

          {/* Conteúdo da Mensagem */}
          <div className="p-6 sm:p-7 py-5 overflow-y-auto max-h-[50vh] space-y-4">
            <div className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap font-normal selection:bg-amber-500/30">
              {currentItem.message}
            </div>

            {/* Ação ou Link Externo (se configurado) */}
            {currentItem.action_url && (
              <div className="pt-2">
                <a
                  href={currentItem.action_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-xs transition border border-neutral-200 dark:border-neutral-700"
                >
                  <span>{currentItem.action_label || 'Acessar Documento / Detalhes'}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                </a>
              </div>
            )}

            {/* Metadados e Vigência */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Publicado em {new Date(currentItem.created_at).toLocaleDateString('pt-BR')}
              </span>
              {currentItem.valid_until && (
                <span>
                  Válido até {new Date(currentItem.valid_until).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>

          {/* Rodapé com Botão de Confirmação e Paginação */}
          <div className="p-5 sm:p-6 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-4">
            {/* Navegação entre múltiplos comunicados */}
            {announcements.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Comunicado anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400">
                  {currentIndex + 1} de {announcements.length}
                </span>
                <button
                  disabled={currentIndex === announcements.length - 1}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Próximo comunicado"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Comunicação Oficial AFIC</span>
              </div>
            )}

            {/* Botão de Tomar Ciência / Confirmar Leitura */}
            <button
              onClick={handleAcknowledge}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{currentIndex < announcements.length - 1 ? 'Ciente · Próximo' : 'Estou ciente e entendido'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OfficialAnnouncementBanner;
