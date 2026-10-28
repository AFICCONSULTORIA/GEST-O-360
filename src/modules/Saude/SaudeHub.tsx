import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartPulse, Stethoscope, ShieldAlert, ArrowLeftRight, 
  Sparkles, Layers, Activity, Pill, UserCheck
} from 'lucide-react';
import { AdminUser } from '../../types';
import { hasHealthConsultorioAccess, hasHealthRegulacaoAccess } from '../../lib/permissions';
import { SaudeModule } from './index';
import { ConsultorioModule } from './ConsultorioModule';

interface SaudeHubProps {
  currentInstitution?: { id: string; name?: string } | null;
  currentUser?: AdminUser | null;
}

export const SaudeHub: React.FC<SaudeHubProps> = ({
  currentInstitution,
  currentUser
}) => {
  const canConsultorio = hasHealthConsultorioAccess(currentUser);
  const canRegulacao = hasHealthRegulacaoAccess(currentUser);

  // Determinar a aba inicial com base nas permissões
  const getInitialTab = (): 'regulacao' | 'consultorio' => {
    if (canConsultorio && !canRegulacao) return 'consultorio';
    if (canRegulacao && !canConsultorio) return 'regulacao';

    // Se tem ambos, checa preferência salva em sessão
    const saved = sessionStorage.getItem('gestao360_saude_active_hub');
    if (saved === 'consultorio' || saved === 'regulacao') {
      return saved;
    }
    return 'regulacao';
  };

  const [activeSubModule, setActiveSubModule] = useState<'regulacao' | 'consultorio'>(getInitialTab);

  // Atualizar quando o usuário mudar ou se suas permissões alterarem
  useEffect(() => {
    if (canConsultorio && !canRegulacao) {
      setActiveSubModule('consultorio');
    } else if (canRegulacao && !canConsultorio) {
      setActiveSubModule('regulacao');
    }
  }, [canConsultorio, canRegulacao, currentUser?.id]);

  const handleSwitchTab = (tab: 'regulacao' | 'consultorio') => {
    setActiveSubModule(tab);
    sessionStorage.setItem('gestao360_saude_active_hub', tab);
  };

  // CASO 1: Usuário sem permissão a nenhum dos submódulos
  if (!canConsultorio && !canRegulacao) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-md text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/50">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white">Acesso Restrito à Saúde</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            Seu usuário não possui permissão ativa para a <strong>Regulação & Farmácia</strong> nem para o <strong>Consultório Médico</strong>.
          </p>
          <p className="text-xs text-neutral-400 mt-4">
            Entre em contato com o administrador municipal ou secretário de saúde para solicitar seu perfil de acesso.
          </p>
        </div>
      </div>
    );
  }

  // CASO 2: Acesso exclusivo ao Consultório Médico (Médicos e Enfermeiros de triagem)
  // Abre direto o Consultório Médico, sem nenhum switcher nem visual de regulação
  if (canConsultorio && !canRegulacao) {
    return (
      <ConsultorioModule 
        currentInstitution={currentInstitution} 
        currentUser={currentUser} 
      />
    );
  }

  // CASO 3: Acesso exclusivo à Regulação & Farmácia (Atendentes, Farmacêuticos, Reguladores)
  // Abre direto Regulação & Farmácia, sem opções de consultório
  if (canRegulacao && !canConsultorio) {
    return (
      <SaudeModule 
        currentInstitution={currentInstitution} 
        currentUser={currentUser} 
      />
    );
  }

  // CASO 4: Usuário tem acesso a AMBOS (Gestores, Secretários de Saúde, Super Admin)
  // Apresenta seletor superior premium com abas dinâmicas
  return (
    <div className="space-y-6">
      {/* Barra de Seleção de Ambientes da Saúde */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-950 p-4 sm:p-5 rounded-3xl text-white shadow-xl shadow-teal-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-700/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/10 text-teal-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
              <Layers size={12} /> Secretaria de Saúde • Gestão Integrada
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              Acesso Total aos Ambientes
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Complexo Municipal de Saúde 360°
          </h1>
          <p className="text-xs text-teal-200/80 mt-0.5 max-w-xl">
            Alterne instantaneamente entre o fluxo de regulação/farmácia e a área clínica de consultório médico.
          </p>
        </div>

        {/* Switcher Interativo de Ambientes */}
        <div className="bg-black/30 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex items-center gap-1.5 self-start md:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => handleSwitchTab('regulacao')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all tracking-wide ${
              activeSubModule === 'regulacao'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-[1.02]'
                : 'text-teal-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <HeartPulse size={16} />
            <span>Regulação & Farmácia</span>
          </button>

          <button
            onClick={() => handleSwitchTab('consultorio')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all tracking-wide ${
              activeSubModule === 'consultorio'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 scale-[1.02]'
                : 'text-cyan-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Stethoscope size={16} />
            <span>Consultório & Triagem PEP</span>
          </button>
        </div>
      </div>

      {/* Renderização do Submódulo Ativo com animação suave */}
      <AnimatePresence mode="wait">
        {activeSubModule === 'regulacao' ? (
          <motion.div
            key="hub-regulacao"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <SaudeModule 
              currentInstitution={currentInstitution} 
              currentUser={currentUser} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="hub-consultorio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <ConsultorioModule 
              currentInstitution={currentInstitution} 
              currentUser={currentUser} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
