import React, { useState } from 'react';
import { Tag, ShieldCheck, RefreshCw, X, Calendar, Clock, Layers } from 'lucide-react';
import { APP_VERSION, APP_VERSION_STRING } from '../config/version';

interface VersionBadgeProps {
  variant?: 'navbar' | 'footer' | 'login' | 'minimal';
  className?: string;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ variant = 'navbar', className = '' }) => {
  const [showModal, setShowModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleHardRefresh = () => {
    setIsRefreshing(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  // Renderização variante para a tela de login
  if (variant === 'login') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all cursor-pointer bg-white/70 hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-white/10 backdrop-blur-md shadow-xs ${className}`}
          title="Clique para detalhes da versão"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Versão {APP_VERSION.version}</span>
        </button>
        {renderModal()}
      </>
    );
  }

  // Renderização variante para o rodapé
  if (variant === 'footer') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer ${className}`}
          title="Informações da versão"
        >
          <Tag size={12} />
          <span>Versão {APP_VERSION.version}</span>
        </button>
        {renderModal()}
      </>
    );
  }

  // Renderização padrão (Navbar)
  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider transition-all cursor-pointer bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs ${className}`}
        title="Clique para visualizar informações da versão do sistema"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
        <span className="font-['Montserrat'] font-bold">{APP_VERSION_STRING}</span>
      </button>

      {renderModal()}
    </>
  );

  function renderModal() {
    if (!showModal) return null;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={() => setShowModal(false)}
      >
        <div 
          className="relative w-full max-w-sm bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-neutral-900 dark:text-white"
          onClick={e => e.stopPropagation()}
        >
          {/* Botão Fechar */}
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors"
          >
            <X size={18} />
          </button>

          {/* Cabeçalho */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight font-['Montserrat']">
                Gestão 360
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Controle de Versão do Sistema
              </p>
            </div>
          </div>

          {/* Dados da Versão */}
          <div className="space-y-3 mb-5">
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/70 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Versão Ativa
                </span>
                <span className="text-xl font-black font-['Montserrat'] text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {APP_VERSION.version}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase">
                Oficial
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-bold uppercase mb-1">
                  <Calendar size={11} /> Data da Versão
                </span>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">{APP_VERSION.buildDate || 'Atual'}</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-bold uppercase mb-1">
                  <Clock size={11} /> Horário
                </span>
                <p className="font-bold text-neutral-800 dark:text-neutral-200">{APP_VERSION.buildTime || 'Recente'}</p>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-0.5">Formato [Major.Minor.Patch.Build]:</span>
              A 4ª casa (revisão) avança automaticamente a cada nova atualização do sistema.
            </div>
          </div>

          {/* Botão de Atualização Forçada */}
          <button
            type="button"
            onClick={handleHardRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Limpando cache...' : 'Recarregar & Verificar Atualizações'}</span>
          </button>
        </div>
      </div>
    );
  }
};

