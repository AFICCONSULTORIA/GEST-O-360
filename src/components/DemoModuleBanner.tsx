import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Trash2, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  Layers, 
  Info,
  ChevronDown,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { 
  seedDemoDataForModule, 
  clearDemoDataForModule, 
  hasDemoDataForModule, 
  getModuleFriendlyName,
  setDemoEnvironment
} from '../lib/demoManager';

interface DemoModuleBannerProps {
  activeView: string;
  onRefreshView?: () => void;
}

export const DemoModuleBanner: React.FC<DemoModuleBannerProps> = ({ 
  activeView,
  onRefreshView 
}) => {
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const checkStatus = () => {
    setHasData(hasDemoDataForModule(activeView));
  };

  useEffect(() => {
    checkStatus();
  }, [activeView]);

  useEffect(() => {
    const handleReload = () => {
      checkStatus();
    };
    window.addEventListener('gestao360:reload-module', handleReload);
    return () => window.removeEventListener('gestao360:reload-module', handleReload);
  }, [activeView]);

  const handleSeed = async (targetModule = activeView) => {
    setLoading(true);
    try {
      await seedDemoDataForModule(targetModule);
      setHasData(true);
      if (onRefreshView) onRefreshView();
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const handleClear = () => {
    clearDemoDataForModule(activeView);
    setHasData(false);
    if (onRefreshView) onRefreshView();
  };

  const friendlyName = getModuleFriendlyName(activeView);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 relative group print:hidden"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-neutral-900/95 p-4 sm:p-5 text-white shadow-xl shadow-purple-950/20 border border-purple-500/30 backdrop-blur-md">
        
        {/* Ambient Glow Emitters */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 w-56 h-56 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Informações do Módulo */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0 mt-0.5 sm:mt-0 ring-2 ring-white/20">
              <Sparkles size={20} className="animate-pulse" />
            </div>

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Ambiente de Demonstração
                </span>
                
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  hasData 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                    : 'bg-white/10 text-neutral-300 border border-white/15'
                }`}>
                  {hasData ? (
                    <>
                      <CheckCircle2 size={11} className="text-emerald-400" />
                      Com dados de exemplo
                    </>
                  ) : (
                    <>
                      <Info size={11} className="text-neutral-400" />
                      Módulo sem dados
                    </>
                  )}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 pt-0.5">
                Módulo: <span className="text-purple-200 font-extrabold">{friendlyName}</span>
              </h4>
              <p className="text-[11px] sm:text-xs text-white/70 max-w-xl leading-relaxed">
                Clique no botão ao lado para preencher este módulo com dados fictícios e visualizar tabelas, gráficos e fluxos como se estivessem em produção real.
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
            
            {/* Botão Principal de Preenchimento */}
            <button
              onClick={() => handleSeed(activeView)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 shadow-lg shadow-purple-500/30 active:scale-95 transition-all flex items-center gap-2 border border-white/20 disabled:opacity-50"
              title="Preencher este módulo com dados de exemplo"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-white" />
                  Preenchendo...
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-yellow-300" />
                  {hasData ? 'Recarregar Exemplo' : 'Preencher Dados de Exemplo'}
                </>
              )}
            </button>

            {/* Limpar Dados (se houver dados) */}
            {hasData && (
              <button
                onClick={handleClear}
                className="px-3 py-2.5 rounded-xl font-bold text-xs text-neutral-300 hover:text-white bg-white/10 hover:bg-rose-500/20 hover:border-rose-400/40 border border-white/10 transition-all flex items-center gap-1.5"
                title="Limpar dados fictícios deste módulo"
              >
                <Trash2 size={13} className="text-rose-400" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}

            {/* Menu de Ações Rápidas */}
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-all flex items-center"
                title="Mais opções da demonstração"
              >
                <ChevronDown size={14} className={`transition-transform duration-200 ${showOptions ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showOptions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-neutral-900 border border-purple-500/30 p-2 shadow-2xl z-50 text-neutral-200 text-xs backdrop-blur-xl"
                  >
                    <button
                      onClick={() => {
                        setShowOptions(false);
                        handleSeed('all');
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-purple-500/20 hover:text-white font-bold flex items-center gap-2 transition-colors text-purple-300"
                    >
                      <Zap size={14} className="text-yellow-400" />
                      Preencher Todos os Módulos
                    </button>

                    <button
                      onClick={() => {
                        setShowOptions(false);
                        clearDemoDataForModule('all');
                        setHasData(false);
                        if (onRefreshView) onRefreshView();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-500/20 hover:text-rose-300 font-bold flex items-center gap-2 transition-colors text-neutral-300"
                    >
                      <Trash2 size={14} className="text-rose-400" />
                      Limpar Toda a Demonstração
                    </button>

                    <div className="border-t border-white/10 my-1" />

                    <button
                      onClick={() => {
                        setShowOptions(false);
                        setDemoEnvironment(false);
                        window.location.reload();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center gap-2 transition-colors"
                    >
                      Sair do Modo Demonstração
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>
    </motion.div>
  );
};
