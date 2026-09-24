import React, { useState } from 'react';
import { Sparkles, RefreshCw, Check } from 'lucide-react';
import { isDemoEnvironment, seedDemoDataForModule, getModuleFriendlyName } from '../lib/demoManager';

interface DemoFillButtonProps {
  moduleKey: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'empty-state';
  onSuccess?: () => void;
  label?: string;
}

export const DemoFillButton: React.FC<DemoFillButtonProps> = ({
  moduleKey,
  className = '',
  variant = 'secondary',
  onSuccess,
  label
}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Exibe apenas se estiver em ambiente de demonstração
  if (!isDemoEnvironment()) {
    return null;
  }

  const handleSeed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const ok = await seedDemoDataForModule(moduleKey);
      if (ok) {
        setSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => setSuccess(false), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const friendlyName = getModuleFriendlyName(moduleKey);

  if (variant === 'empty-state') {
    return (
      <button
        onClick={handleSeed}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 shadow-xl shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <>
            <RefreshCw size={15} className="animate-spin text-white" />
            <span>Preenchendo Módulo...</span>
          </>
        ) : success ? (
          <>
            <Check size={15} className="text-emerald-300" />
            <span>Dados Preenchidos!</span>
          </>
        ) : (
          <>
            <Sparkles size={15} className="text-yellow-300 animate-pulse" />
            <span>{label || `Preencher ${friendlyName} com Dados de Exemplo`}</span>
          </>
        )}
      </button>
    );
  }

  if (variant === 'primary') {
    return (
      <button
        onClick={handleSeed}
        disabled={loading}
        title={`Preencher ${friendlyName} com dados de demonstração`}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/20 active:scale-95 transition-all disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <RefreshCw size={13} className="animate-spin text-white" />
        ) : success ? (
          <Check size={13} className="text-emerald-300" />
        ) : (
          <Sparkles size={13} className="text-yellow-300" />
        )}
        <span>{label || (success ? 'Preenchido!' : 'Dados de Exemplo')}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      title={`Preencher ${friendlyName} com dados de demonstração`}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/60 active:scale-95 transition-all disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <RefreshCw size={13} className="animate-spin text-purple-600 dark:text-purple-400" />
      ) : success ? (
        <Check size={13} className="text-emerald-500" />
      ) : (
        <Sparkles size={13} className="text-purple-500 dark:text-purple-400" />
      )}
      <span>{label || (success ? 'Preenchido!' : 'Exemplo')}</span>
    </button>
  );
};
